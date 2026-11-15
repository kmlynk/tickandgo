import type {
    CreateEventRequest,
    CreateEventResponse,
    ErrorResponse,
    EventDetailsResponse,
    EventFormValues,
    ListEventResponse,
    ListPublishedEventResponse,
    ListTicketResponse,
    PageResult,
    PublishedEventDetailsResponse,
    TicketDetailsResponse,
    TicketValidationMethod,
    TicketValidationResponse,
    UpdateEventResponse,
} from "./types";

interface PageMeta {
    number: number;
    totalPages: number;
    totalElements: number;
}

// Spring Data serialises a Page either as { content, page: {...} } (VIA_DTO,
// the default in Spring Boot 4) or flat as { content, number, totalPages, ... }.
type SpringPage<T> = { content: T[] } & (PageMeta | { page: PageMeta });

function toPageResult<T>(body: SpringPage<T>): PageResult<T> {
    const meta = "page" in body ? body.page : body;
    return {
        content: body.content,
        number: meta.number,
        totalPages: meta.totalPages,
        totalElements: meta.totalElements,
    };
}

/**
 * Calls the backend. Pass `null` as accessToken for public endpoints: no
 * Authorization header is sent then, because Spring rejects an expired token
 * even on endpoints that are permitAll().
 */
async function request<T>(path: string, accessToken: string | null, init: RequestInit): Promise<T> {
    const response = await fetch(path, {
        ...init,
        headers: {
            ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
            "Content-Type": "application/json",
            ...init.headers,
        },
    });

    const text = await response.text();
    let body: unknown = undefined;
    try {
        body = text ? JSON.parse(text) : undefined;
    } catch {
        // Not JSON (e.g. an HTML error page from the proxy). Fall through.
    }

    if (!response.ok) {
        const message =
            body && typeof (body as ErrorResponse).error === "string"
                ? (body as ErrorResponse).error
                : response.status === 403
                    ? "You don't have permission to do this. Your account is missing the required role."
                    : `${response.status} ${response.statusText || "request failed"}`;
        throw new Error(message);
    }

    return body as T;
}

export async function listMyEvents(accessToken: string, page: number, size = 10) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc",
    });
    const body = await request<SpringPage<ListEventResponse>>(
        `/api/v1/events?${params}`,
        accessToken,
        {method: "GET"},
    );
    return toPageResult(body);
}

/**
 * Public: no login needed. Without a query: soonest events first.
 * With a query: full-text search over name and venue.
 */
export async function listPublishedEvents(page: number, query = "", size = 12) {
    const params = new URLSearchParams({page: String(page), size: String(size)});
    const q = query.trim();
    if (q) {
        params.set("q", q);
        // No sort here: the search is a native SQL query, where Spring passes the
        // sort through as a column name, and "start" is "event_start" in the DB (500).
    } else {
        params.set("sort", "start,asc");
    }
    const body = await request<SpringPage<ListPublishedEventResponse>>(
        `/api/v1/published-events?${params}`,
        null,
        {method: "GET"},
    );
    return toPageResult(body);
}

/** Public: no login needed. 404 if the event doesn't exist or isn't published. */
export async function getPublishedEvent(eventId: string) {
    try {
        return await request<PublishedEventDetailsResponse>(
            `/api/v1/published-events/${encodeURIComponent(eventId)}`,
            null,
            {method: "GET"},
        );
    } catch (err) {
        if (err instanceof Error && err.message.startsWith("404")) {
            throw new Error("This event isn't available. It may have been unpublished or removed.");
        }
        throw err;
    }
}

export async function getEvent(accessToken: string, eventId: string) {
    try {
        return await request<EventDetailsResponse>(
            `/api/v1/events/${encodeURIComponent(eventId)}`,
            accessToken,
            {method: "GET"},
        );
    } catch (err) {
        // The backend answers 404 with an empty body if the event doesn't exist or isn't yours.
        if (err instanceof Error && err.message.startsWith("404")) {
            throw new Error("Event not found. It may have been deleted or belong to another organizer.");
        }
        throw err;
    }
}

export function createEvent(accessToken: string, event: CreateEventRequest) {
    return request<CreateEventResponse>("/api/v1/events", accessToken, {
        method: "POST",
        body: JSON.stringify(event),
    });
}

/** Backend answers 204 No Content (also when the event is missing or not yours). */
export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
    await request<void>(`/api/v1/events/${encodeURIComponent(eventId)}`, accessToken, {
        method: "DELETE",
    });
}

export function updateEvent(accessToken: string, eventId: string, values: EventFormValues) {
    return request<UpdateEventResponse>(`/api/v1/events/${encodeURIComponent(eventId)}`, accessToken, {
        method: "PUT",
        body: JSON.stringify({...values, id: eventId}),
    });
}

/**
 * Buys one ticket of the given type for the logged-in user.
 * Backend answers 204 No Content; 400 with an error message if sold out.
 */
export async function purchaseTicket(
    accessToken: string,
    eventId: string,
    ticketTypeId: string,
): Promise<void> {
    const path =
        `/api/v1/events/${encodeURIComponent(eventId)}` +
        `/ticket-types/${encodeURIComponent(ticketTypeId)}/tickets`;
    try {
        await request<void>(path, accessToken, {method: "POST"});
    } catch (err) {
        if (err instanceof Error && err.message.startsWith("401")) {
            throw new Error("Your login has expired. Please log in again to buy tickets.");
        }
        throw err;
    }
}

/** The logged-in user's purchased tickets, newest first. Any logged-in user. */
export async function listMyTickets(accessToken: string, page: number, size = 10) {
    const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sort: "createdAt,desc",
    });
    const body = await request<SpringPage<ListTicketResponse>>(
        `/api/v1/tickets?${params}`,
        accessToken,
        {method: "GET"},
    );
    return toPageResult(body);
}

/** One of the logged-in user's tickets. 404 if it doesn't exist or isn't theirs. */
export async function getTicket(accessToken: string, ticketId: string) {
    try {
        return await request<TicketDetailsResponse>(
            `/api/v1/tickets/${encodeURIComponent(ticketId)}`,
            accessToken,
            {method: "GET"},
        );
    } catch (err) {
        if (err instanceof Error && err.message.startsWith("404")) {
            throw new Error("Ticket not found. It may belong to another account.");
        }
        throw err;
    }
}

/**
 * The ticket's QR code as a PNG. Fetched with the token (an <img src> can't send
 * one), so the caller turns the Blob into an object URL and revokes it later.
 */
export async function getTicketQrCode(accessToken: string, ticketId: string): Promise<Blob> {
    const response = await fetch(`/api/v1/tickets/${encodeURIComponent(ticketId)}/qr-codes`, {
        headers: {Authorization: `Bearer ${accessToken}`},
    });
    if (response.ok) return response.blob();

    let message = `${response.status} ${response.statusText || "request failed"}`;
    try {
        const body = (await response.json()) as Partial<ErrorResponse>;
        if (typeof body.error === "string") message = body.error;
    } catch {
        // No JSON body.
    }
    throw new Error(message);
}

/**
 * Staff only. Validates a ticket at the entrance:
 * - QR_SCAN: `id` is the value inside the QR code (the QR code's ID),
 * - MANUAL: `id` is the ticket ID.
 * The first validation of a ticket is VALID, every later one INVALID.
 */
export function validateTicket(accessToken: string, id: string, method: TicketValidationMethod) {
    return request<TicketValidationResponse>("/api/v1/ticket-validations", accessToken, {
        method: "POST",
        body: JSON.stringify({id, method}),
    });
}

/**
 * Buys `quantity` tickets of one type. The backend sells one ticket per call,
 * so this calls it once per ticket and stops at the first failure.
 * Returns how many were bought; throws only if none could be bought.
 */
export async function purchaseTickets(
    accessToken: string,
    eventId: string,
    ticketTypeId: string,
    quantity: number,
): Promise<{ bought: number; error?: string }> {
    let bought = 0;
    for (; bought < quantity; bought++) {
        try {
            await purchaseTicket(accessToken, eventId, ticketTypeId);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (bought === 0) throw err;
            return {bought, error: message};
        }
    }
    return {bought};
}
