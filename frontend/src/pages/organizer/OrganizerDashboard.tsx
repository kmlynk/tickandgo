import {useEffect, useMemo, useState} from "react";
import {Link, useSearchParams} from "react-router";
import {Chip, EmptyState, ErrorBox, PageHeader, Pagination, Spinner} from "../../components/common";
import EventCover from "../../components/EventCover";
import Icon, {type IconName} from "../../components/Icon";
import {useToast} from "../../components/Toast";
import {deleteEvent, listMyEvents} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {errorText, formatPrice, formatWhen, isPast} from "../../lib/format";
import {parsePage, useCurrentPath, type NavState} from "../../lib/navigation";
import {EVENT_STATUS_LABEL} from "../../lib/ticketStatus";
import type {EventStatus, ListEventResponse, PageResult} from "../../lib/types";

/** Organizers rarely have hundreds of events, so one big page allows instant filtering. */
const PAGE_SIZE = 100;

type Filter = "all" | "upcoming" | "drafts" | "past" | "cancelled";
const FILTERS: { key: Filter; label: string }[] = [
    {key: "all", label: "All"},
    {key: "upcoming", label: "Live & upcoming"},
    {key: "drafts", label: "Drafts"},
    {key: "past", label: "Past"},
    {key: "cancelled", label: "Cancelled"},
];

export const eventStatusTone: Record<EventStatus, string> = {
    DRAFT: "warning",
    PUBLISHED: "success",
    CANCELED: "danger",
    COMPLETED: "neutral",
};

function matches(event: ListEventResponse, filter: Filter): boolean {
    const past = isPast(event.start, event.end) || event.status === "COMPLETED";
    switch (filter) {
        case "upcoming":
            return event.status === "PUBLISHED" && !past;
        case "drafts":
            return event.status === "DRAFT";
        case "past":
            return past && event.status !== "CANCELED";
        case "cancelled":
            return event.status === "CANCELED";
        default:
            return true;
    }
}

function capacityLabel(event: ListEventResponse): string {
    if (event.ticketTypes.length === 0) return "No capacity yet";
    if (event.ticketTypes.some((t) => t.totalAvailable == null)) return "Unlimited";
    return `${event.ticketTypes.reduce((n, t) => n + (t.totalAvailable ?? 0), 0)} capacity`;
}

function priceRange(event: ListEventResponse): string {
    if (event.ticketTypes.length === 0) return "No tickets";
    const prices = event.ticketTypes.map((t) => t.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const fmt = (p: number) => (p === 0 ? "Free" : formatPrice(p));
    return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
}

function Stat({icon, label, value, tone}: { icon: IconName; label: string; value: string | number; tone: string }) {
    return (
        <div className="stat">
      <span className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={20}/>
      </span>
            <div>
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
            </div>
        </div>
    );
}

/** /organizer : the organizer's events with stats, filters and search. */
export default function OrganizerDashboard() {
    const accessToken = useAccessToken();
    const toast = useToast();
    const currentPath = useCurrentPath();
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parsePage(searchParams.get("page"));
    const filter = (searchParams.get("filter") as Filter | null) ?? "all";
    const [search, setSearch] = useState("");

    const [result, setResult] = useState<PageResult<ListEventResponse>>();
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [deletingId, setDeletingId] = useState<string>();

    const setParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        setSearchParams(next, {replace: true});
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        listMyEvents(accessToken, page, PAGE_SIZE)
            .then((r) => !cancelled && setResult(r))
            .catch((err) => !cancelled && setError(errorText(err)))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [accessToken, page, reloadKey]);

    const events = result?.content ?? [];
    const stats = useMemo(
        () => ({
            total: result?.totalElements ?? 0,
            live: events.filter((e) => matches(e, "upcoming")).length,
            drafts: events.filter((e) => e.status === "DRAFT").length,
            ticketTypes: events.reduce((n, e) => n + e.ticketTypes.length, 0),
        }),
        [events, result],
    );

    const visible = events.filter(
        (e) =>
            matches(e, filter) &&
            (search.trim() === "" ||
                `${e.name} ${e.venue}`.toLowerCase().includes(search.trim().toLowerCase())),
    );

    const handleDelete = async (event: ListEventResponse) => {
        if (!window.confirm(`Delete "${event.name}"? Its ticket types are deleted too. This can't be undone.`)) return;
        setDeletingId(event.id);
        try {
            await deleteEvent(accessToken, event.id);
            toast(`“${event.name}” was deleted`);
            setReloadKey((k) => k + 1);
        } catch (err) {
            toast(errorText(err), "error");
        } finally {
            setDeletingId(undefined);
        }
    };

    return (
        <div className="container section">
            <PageHeader
                title="Your events"
                subtitle="Create events, manage ticket types and track what's live."
                actions={
                    <Link to="/organizer/events/new" className="btn btn-primary">
                        <Icon name="plus" size={18}/> New event
                    </Link>
                }
            />

            <div className="stats">
                <Stat icon="calendar" label="Total events" value={stats.total} tone="brand"/>
                <Stat icon="eye" label="Live & upcoming" value={stats.live} tone="success"/>
                <Stat icon="edit" label="Drafts" value={stats.drafts} tone="warning"/>
                <Stat icon="ticket" label="Ticket types" value={stats.ticketTypes} tone="info"/>
            </div>

            <div className="toolbar">
                <div className="chips-scroll" role="tablist" aria-label="Filter events">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            role="tab"
                            aria-selected={filter === f.key}
                            className={`filter-chip${filter === f.key ? " active" : ""}`}
                            onClick={() => setParam("filter", f.key === "all" ? null : f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <label className="input-with-icon toolbar-search">
                    <Icon name="search" size={18}/>
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your events"
                        aria-label="Search your events"
                    />
                </label>
            </div>

            {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)}/>}
            {loading && !result && (
                <div className="center-block">
                    <Spinner/>
                </div>
            )}

            {result && events.length === 0 && (
                <EmptyState
                    icon="sparkles"
                    title="Create your first event"
                    action={
                        <Link to="/organizer/events/new" className="btn btn-primary">
                            <Icon name="plus" size={18}/> New event
                        </Link>
                    }
                >
                    Add the date, venue and ticket types. Publish it when you're ready to sell.
                </EmptyState>
            )}

            {result && events.length > 0 && visible.length === 0 && (
                <EmptyState icon="search" title="No events match">
                    Try another filter or search term.
                </EmptyState>
            )}

            <div className="org-list">
                {visible.map((event) => {
                    return (
                        <article key={event.id} className="org-event card">
                            <EventCover seed={event.id} className="org-event-cover"/>
                            <div className="org-event-body">
                                <div className="org-event-top">
                                    <Chip tone={eventStatusTone[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Chip>
                                    {event.status === "PUBLISHED" && isPast(event.start, event.end) &&
                                        <Chip tone="neutral">Ended</Chip>}
                                </div>
                                <h2>
                                    <Link to={`/organizer/events/${event.id}/edit`}
                                          state={{from: currentPath} satisfies NavState}>
                                        {event.name}
                                    </Link>
                                </h2>
                                <p className="meta">
                                    <Icon name="calendar" size={15}/> {formatWhen(event.start, event.end)}
                                </p>
                                <p className="meta">
                                    <Icon name="pin" size={15}/> <span className="truncate">{event.venue}</span>
                                </p>
                                <div className="org-event-facts">
                  <span>
                    <Icon name="ticket" size={15}/> {event.ticketTypes.length} type
                      {event.ticketTypes.length === 1 ? "" : "s"}
                  </span>
                                    <span>
                    <Icon name="users" size={15}/> {capacityLabel(event)}
                  </span>
                                    <span>
                    <Icon name="euro" size={15}/> {priceRange(event)}
                  </span>
                                </div>
                            </div>
                            <div className="org-event-actions">
                                <Link
                                    to={`/organizer/events/${event.id}/edit`}
                                    state={{from: currentPath} satisfies NavState}
                                    className="btn btn-secondary btn-sm"
                                >
                                    <Icon name="edit" size={16}/> Edit
                                </Link>
                                {event.status === "PUBLISHED" && (
                                    <Link to={`/events/${event.id}`} state={{from: currentPath} satisfies NavState}
                                          className="btn btn-ghost btn-sm">
                                        <Icon name="eye" size={16}/> View
                                    </Link>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-danger-text"
                                    onClick={() => handleDelete(event)}
                                    disabled={deletingId !== undefined}
                                    aria-label={`Delete ${event.name}`}
                                >
                                    {deletingId === event.id ? <Spinner/> : <Icon name="trash" size={16}/>}
                                    <span className="hide-xs">Delete</span>
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>

            {result && (
                <Pagination
                    page={page}
                    totalPages={result.totalPages}
                    disabled={loading}
                    onPageChange={(p) => setParam("page", p > 0 ? String(p) : null)}
                />
            )}
        </div>
    );
}
