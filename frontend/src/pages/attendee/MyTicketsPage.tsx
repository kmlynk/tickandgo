import {useEffect, useMemo, useState} from "react";
import {Link, useSearchParams} from "react-router";
import {Chip, DateBadge, EmptyState, ErrorBox, PageHeader, Spinner} from "../../components/common";
import EventCover from "../../components/EventCover";
import Icon from "../../components/Icon";
import {listMyTickets} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {errorText, formatPriceOrFree, formatWhen, isPast, ticketCode} from "../../lib/format";
import {useCurrentPath, type NavState} from "../../lib/navigation";
import {TICKET_STATUS_LABEL} from "../../lib/ticketStatus";
import type {ListTicketResponse} from "../../lib/types";

const PAGE_SIZE = 50;

interface EventGroup {
    key: string;
    event: ListTicketResponse["event"];
    tickets: ListTicketResponse[];
}

const statusTone = {PURCHASED: "success", USED: "neutral", CANCELLED: "danger"} as const;

/** Groups tickets by event, soonest event first (past: most recent first). */
function groupByEvent(tickets: ListTicketResponse[], past: boolean): EventGroup[] {
    const groups = new Map<string, EventGroup>();
    for (const t of tickets) {
        const key = t.event?.id ?? `unknown-${t.id}`;
        const group = groups.get(key) ?? {key, event: t.event, tickets: []};
        group.tickets.push(t);
        groups.set(key, group);
    }
    const time = (g: EventGroup) => (g.event?.start ? new Date(g.event.start).getTime() : Infinity);
    return [...groups.values()].sort((a, b) => (past ? time(b) - time(a) : time(a) - time(b)));
}

/** /tickets?view=past : the attendee's tickets, grouped per event. */
export default function MyTicketsPage() {
    const accessToken = useAccessToken();
    const currentPath = useCurrentPath();
    const [searchParams, setSearchParams] = useSearchParams();
    const view = searchParams.get("view") === "past" ? "past" : "upcoming";

    const [tickets, setTickets] = useState<ListTicketResponse[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>();
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        listMyTickets(accessToken, page, PAGE_SIZE)
            .then((r) => {
                if (cancelled) return;
                setTickets((list) => (page === 0 ? r.content : [...list, ...r.content]));
                setTotalPages(r.totalPages);
            })
            .catch((err) => !cancelled && setError(errorText(err)))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [accessToken, page, reloadKey]);

    const {upcoming, past} = useMemo(() => {
        const isOver = (t: ListTicketResponse) => !!t.event && isPast(t.event.start, t.event.end);
        return {
            upcoming: groupByEvent(tickets.filter((t) => !isOver(t)), false),
            past: groupByEvent(tickets.filter(isOver), true),
        };
    }, [tickets]);

    const groups = view === "past" ? past : upcoming;
    const count = (g: EventGroup[]) => g.reduce((n, x) => n + x.tickets.length, 0);

    return (
        <div className="container section">
            <PageHeader title="My tickets" subtitle="Show the QR code at the entrance to get in."/>

            <div className="segmented" role="tablist" aria-label="Which tickets">
                {(["upcoming", "past"] as const).map((v) => (
                    <button
                        key={v}
                        type="button"
                        role="tab"
                        aria-selected={view === v}
                        className={view === v ? "active" : ""}
                        onClick={() => setSearchParams(v === "past" ? {view: "past"} : {}, {replace: true})}
                    >
                        {v === "upcoming" ? "Upcoming" : "Past"}
                        <span className="segmented-count">{count(v === "upcoming" ? upcoming : past)}</span>
                    </button>
                ))}
            </div>

            {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)}/>}

            {loading && tickets.length === 0 && (
                <div className="center-block">
                    <Spinner/>
                </div>
            )}

            {!loading && !error && groups.length === 0 && (
                <EmptyState
                    icon="ticket"
                    title={view === "past" ? "No past events yet" : "No upcoming tickets"}
                    action={
                        view === "upcoming" ? (
                            <Link to="/" className="btn btn-primary">
                                Discover events
                            </Link>
                        ) : undefined
                    }
                >
                    {view === "past"
                        ? "Events you've attended will show up here."
                        : "When you buy tickets, they appear here — ready to scan at the door."}
                </EmptyState>
            )}

            <div className="ticket-groups">
                {groups.map((g) => (
                    <article key={g.key} className={`ticket-group card${view === "past" ? " is-past" : ""}`}>
                        <div className="ticket-group-head">
                            <EventCover seed={g.event?.id ?? g.key} className="ticket-group-cover">
                                <DateBadge value={g.event?.start ?? null}/>
                            </EventCover>
                            <div className="ticket-group-info">
                                <h2>
                                    {g.event ? (
                                        <Link to={`/events/${g.event.id}`}
                                              state={{from: currentPath} satisfies NavState}>
                                            {g.event.name}
                                        </Link>
                                    ) : (
                                        "Event details unavailable"
                                    )}
                                </h2>
                                {g.event && (
                                    <>
                                        <p className="meta">
                                            <Icon name="clock" size={15}/> {formatWhen(g.event.start, g.event.end)}
                                        </p>
                                        <p className="meta">
                                            <Icon name="pin" size={15}/> <span
                                            className="truncate">{g.event.venue}</span>
                                        </p>
                                    </>
                                )}
                            </div>
                            <span className="ticket-count">
                {g.tickets.length} ticket{g.tickets.length === 1 ? "" : "s"}
              </span>
                        </div>

                        <ul className="ticket-rows">
                            {g.tickets.map((t) => (
                                <li key={t.id} className="ticket-row">
                                    <Link to={`/tickets/${t.id}`} state={{from: currentPath} satisfies NavState}
                                          className="ticket-row-main">
                    <span className="ticket-row-icon">
                      <Icon name="ticket" size={18}/>
                    </span>
                                        <span className="ticket-row-text">
                      <strong>{t.ticketType?.name ?? "Ticket"}</strong>
                      <span className="muted small mono">
                        {ticketCode(t.id)} · {formatPriceOrFree(t.ticketType?.price)}
                      </span>
                    </span>
                                        <Chip tone={statusTone[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Chip>
                                    </Link>
                                    <Link
                                        to={`/tickets/${t.id}/qr`}
                                        state={{from: currentPath} satisfies NavState}
                                        className={`btn btn-sm ${t.status === "PURCHASED" && view === "upcoming" ? "btn-primary" : "btn-secondary"}`}
                                        aria-label={`Show QR code for ticket ${ticketCode(t.id)}`}
                                    >
                                        <Icon name="qr" size={16}/> <span className="hide-xs">Show QR</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>

            {page < totalPages - 1 && (
                <div className="center-block">
                    <button type="button" className="btn btn-secondary" disabled={loading}
                            onClick={() => setPage((p) => p + 1)}>
                        {loading ? "Loading…" : "Load more tickets"}
                    </button>
                </div>
            )}
        </div>
    );
}
