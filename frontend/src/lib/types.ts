// Mirrors the DTOs in the tickandgo backend (com.kmlynk.tickandgo.domain.dtos).

export const EVENT_STATUSES = ["DRAFT", "PUBLISHED", "CANCELED", "COMPLETED"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** LocalDateTime as ISO text without zone, e.g. "2026-12-31T20:00". */
export type LocalDateTime = string;

export interface CreateTicketTypeRequest {
    name: string;
    price: number;
    description: string | null;
    totalAvailable: number | null;
}

export interface CreateEventRequest {
    name: string;
    start: LocalDateTime | null;
    end: LocalDateTime | null;
    venue: string;
    salesStart: LocalDateTime | null;
    salesEnd: LocalDateTime | null;
    status: EventStatus;
    ticketTypes: CreateTicketTypeRequest[];
}

export interface CreateTicketTypeResponse extends CreateTicketTypeRequest {
    id: string;
    createdAt: LocalDateTime;
    updatedAt: LocalDateTime;
}

export interface CreateEventResponse extends Omit<CreateEventRequest, "ticketTypes"> {
    id: string;
    ticketTypes: CreateTicketTypeResponse[];
    createdAt: LocalDateTime;
    updatedAt: LocalDateTime;
}

/** GetEventDetailsResponseDto: same fields as the create response. */
export type EventDetailsResponse = CreateEventResponse;

/**
 * UpdateTicketTypeRequestDto. With an id the existing ticket type is updated,
 * without one a new ticket type is created. Ticket types left out are deleted.
 */
export interface UpdateTicketTypeRequest extends CreateTicketTypeRequest {
    id?: string;
}

/** UpdateEventRequestDto. `id` must equal the id in the URL. */
export interface UpdateEventRequest extends Omit<CreateEventRequest, "ticketTypes"> {
    id: string;
    ticketTypes: UpdateTicketTypeRequest[];
}

/** UpdateEventResponseDto: same fields as the create response. */
export type UpdateEventResponse = CreateEventResponse;

/** What the event form produces; ticket types keep their id when they already exist. */
export type EventFormValues = Omit<UpdateEventRequest, "id">;

export interface ListEventTicketTypeResponse {
    id: string;
    name: string;
    price: number;
    description: string | null;
    totalAvailable: number | null;
}

export interface ListEventResponse {
    id: string;
    name: string;
    start: LocalDateTime | null;
    end: LocalDateTime | null;
    venue: string;
    salesStart: LocalDateTime | null;
    salesEnd: LocalDateTime | null;
    status: EventStatus;
    ticketTypes: ListEventTicketTypeResponse[];
}

/** ListPublishedEventsResponseDto: the public summary shown to attendees. */
export interface ListPublishedEventResponse {
    id: string;
    name: string;
    start: LocalDateTime | null;
    venue: string;
}

/** GetPublishedEventTicketTypesResponseDto */
export interface PublishedEventTicketType {
    id: string;
    name: string;
    /** In euros. */
    price: number;
    description: string | null;
}

/** GetPublishedEventDetailsResponseDto: public event page for attendees. */
export interface PublishedEventDetailsResponse {
    id: string;
    name: string;
    start: LocalDateTime | null;
    end: LocalDateTime | null;
    venue: string;
    ticketTypes: PublishedEventTicketType[];
}

/** One page of results, normalised from Spring Data's Page JSON. */
export interface PageResult<T> {
    content: T[];
    number: number;
    totalPages: number;
    totalElements: number;
}

export interface ErrorResponse {
    error: string;
}

export const TICKET_STATUSES = ["PURCHASED", "CANCELLED", "USED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** GET /api/v1/tickets : one of the logged-in user's tickets. */
export interface ListTicketResponse {
    id: string;
    status: TicketStatus;
    ticketType: { id: string; name: string; price: number } | null;
    /** The backend may leave this out (null) if its mapper doesn't fill it. */
    event: {
        id: string;
        name: string;
        start: LocalDateTime | null;
        end: LocalDateTime | null;
        venue: string;
    } | null;
}

/** GET /api/v1/tickets/{ticketId} : one ticket of the logged-in user. */
export interface TicketDetailsResponse {
    id: string;
    status: TicketStatus;
    price: number | null;
    /** Description of the ticket type (the backend doesn't send its name). */
    description: string | null;
    eventName: string | null;
    eventVenue: string | null;
    eventStart: LocalDateTime | null;
    eventEnd: LocalDateTime | null;
}

export type TicketValidationMethod = "QR_SCAN" | "MANUAL";
export type TicketValidationStatus = "VALID" | "INVALID" | "EXPIRED";

/** POST /api/v1/ticket-validations */
export interface TicketValidationResponse {
    ticketId: string;
    status: TicketValidationStatus;
}
