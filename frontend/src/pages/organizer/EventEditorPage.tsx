import {useEffect, useMemo, useState, type FormEvent, type ReactNode} from "react";
import {Link, useNavigate, useParams} from "react-router";
import {Chip, ErrorBox, Spinner} from "../../components/common";
import EventCover from "../../components/EventCover";
import Icon from "../../components/Icon";
import {useToast} from "../../components/Toast";
import {createEvent, deleteEvent, getEvent, updateEvent} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {errorText, formatDate, formatPriceOrFree, formatWhen} from "../../lib/format";
import {useNavState} from "../../lib/navigation";
import {EVENT_STATUS_LABEL} from "../../lib/ticketStatus";
import type {EventDetailsResponse, EventFormValues, EventStatus, LocalDateTime} from "../../lib/types";
import {eventStatusTone} from "./OrganizerDashboard";

interface TicketTypeDraft {
    /** Set for ticket types that already exist in the backend. */
    id?: string;
    /** Stable React key, also for new rows. */
    key: string;
    name: string;
    price: string;
    description: string;
    totalAvailable: string;
}

let keySeq = 0;
const newKey = () => `new-${++keySeq}`;
const emptyTicketType = (name = ""): TicketTypeDraft => ({
    key: newKey(),
    name,
    price: "",
    description: "",
    totalAvailable: "",
});

const orNull = (value: string) => (value.trim() === "" ? null : value);
// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm"; the backend may send seconds.
const toInputDate = (value: LocalDateTime | null) => (value ? value.slice(0, 16) : "");

const STATUS_OPTIONS: { value: EventStatus; title: string; text: string }[] = [
    {value: "DRAFT", title: "Draft", text: "Only you can see it"},
    {value: "PUBLISHED", title: "Published", text: "Visible to everyone, tickets on sale"},
    {value: "CANCELED", title: "Cancelled", text: "Hidden, no more sales"},
    {value: "COMPLETED", title: "Completed", text: "The event is over"},
];

function Section({icon, title, hint, children}: {
    icon: Parameters<typeof Icon>[0]["name"];
    title: string;
    hint?: string;
    children: ReactNode
}) {
    return (
        <section className="card form-section">
            <header className="form-section-head">
        <span className="form-section-icon">
          <Icon name={icon} size={18}/>
        </span>
                <div>
                    <h2>{title}</h2>
                    {hint && <p className="muted small">{hint}</p>}
                </div>
            </header>
            {children}
        </section>
    );
}

/** /organizer/events/new and /organizer/events/:eventId/edit */
export default function EventEditorPage() {
    const {eventId} = useParams();
    const isEdit = !!eventId;
    const accessToken = useAccessToken();
    const navigate = useNavigate();
    const toast = useToast();
    const backTo = useNavState().from ?? "/organizer";

    const [loaded, setLoaded] = useState<EventDetailsResponse>();
    const [loadError, setLoadError] = useState<string>();

    const [name, setName] = useState("");
    const [venue, setVenue] = useState("");
    const [start, setStart] = useState("");
    const [end, setEnd] = useState("");
    const [salesStart, setSalesStart] = useState("");
    const [salesEnd, setSalesEnd] = useState("");
    const [status, setStatus] = useState<EventStatus>("DRAFT");
    const [ticketTypes, setTicketTypes] = useState<TicketTypeDraft[]>(() => [emptyTicketType("General admission")]);

    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string>();
    const [touched, setTouched] = useState(false);

    // Load the event when editing.
    useEffect(() => {
        if (!eventId) return;
        let cancelled = false;
        getEvent(accessToken, eventId)
            .then((e) => {
                if (cancelled) return;
                setLoaded(e);
                setName(e.name);
                setVenue(e.venue);
                setStart(toInputDate(e.start));
                setEnd(toInputDate(e.end));
                setSalesStart(toInputDate(e.salesStart));
                setSalesEnd(toInputDate(e.salesEnd));
                setStatus(e.status);
                setTicketTypes(
                    e.ticketTypes.map((t) => ({
                        id: t.id,
                        key: t.id,
                        name: t.name,
                        price: String(t.price),
                        description: t.description ?? "",
                        totalAvailable: t.totalAvailable == null ? "" : String(t.totalAvailable),
                    })),
                );
            })
            .catch((err) => !cancelled && setLoadError(errorText(err)));
        return () => {
            cancelled = true;
        };
    }, [accessToken, eventId]);

    // Checks the backend doesn't do, shown inline.
    const problems = useMemo(() => {
        const p: Record<string, string> = {};
        if (!name.trim()) p.name = "Give your event a name.";
        if (!venue.trim()) p.venue = "Where does it take place?";
        if (start && end && end <= start) p.end = "The end must be after the start.";
        if (salesStart && salesEnd && salesEnd <= salesStart) p.salesEnd = "Sales must end after they start.";
        if (salesEnd && end && salesEnd > end) p.salesEnd = "Sales should end before the event ends.";
        if (status === "PUBLISHED" && !start) p.start = "Published events need a start date.";
        ticketTypes.forEach((t, i) => {
            if (!t.name.trim()) p[`tt-name-${i}`] = "Name required.";
            if (t.price.trim() === "" || Number(t.price) < 0) p[`tt-price-${i}`] = "0 or more.";
            if (t.totalAvailable.trim() !== "" && (!Number.isInteger(Number(t.totalAvailable)) || Number(t.totalAvailable) < 1))
                p[`tt-total-${i}`] = "Whole number, 1 or more.";
        });
        return p;
    }, [name, venue, start, end, salesStart, salesEnd, status, ticketTypes]);

    const show = (key: string) => (touched ? problems[key] : undefined);

    const updateTicketType = (index: number, field: keyof TicketTypeDraft, value: string) =>
        setTicketTypes((list) => list.map((t, i) => (i === index ? {...t, [field]: value} : t)));

    const removedExisting = loaded
        ? loaded.ticketTypes.filter((t) => !ticketTypes.some((d) => d.id === t.id))
        : [];

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setTouched(true);
        setError(undefined);
        if (Object.keys(problems).length > 0) {
            setError("Please fix the highlighted fields.");
            toast("Please fix the highlighted fields", "error");
            document.querySelector('[aria-invalid="true"]')?.scrollIntoView({behavior: "smooth", block: "center"});
            return;
        }

        const values: EventFormValues = {
            name: name.trim(),
            venue: venue.trim(),
            start: orNull(start),
            end: orNull(end),
            salesStart: orNull(salesStart),
            salesEnd: orNull(salesEnd),
            status,
            ticketTypes: ticketTypes.map((t) => ({
                id: t.id, // undefined for new ones, so JSON leaves it out
                name: t.name.trim(),
                price: Number(t.price),
                description: orNull(t.description),
                totalAvailable: t.totalAvailable.trim() === "" ? null : Number(t.totalAvailable),
            })),
        };

        setSubmitting(true);
        try {
            if (isEdit && eventId) {
                const saved = await updateEvent(accessToken, eventId, values);
                toast(`“${saved.name}” saved`);
            } else {
                const created = await createEvent(accessToken, values);
                toast(created.status === "PUBLISHED" ? `“${created.name}” is live!` : `“${created.name}” saved as draft`);
            }
            navigate(backTo);
        } catch (err) {
            setError(errorText(err));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!loaded) return;
        if (!window.confirm(`Delete "${loaded.name}"? Its ticket types are deleted too. This can't be undone.`)) return;
        setDeleting(true);
        try {
            await deleteEvent(accessToken, loaded.id);
            toast(`“${loaded.name}” was deleted`);
            navigate(backTo);
        } catch (err) {
            setError(errorText(err));
            setDeleting(false);
        }
    };

    if (isEdit && (loadError || !loaded)) {
        return (
            <div className="container narrow section">
                <Link to={backTo} className="back-link">
                    <Icon name="arrowLeft" size={18}/> Your events
                </Link>
                {loadError ? <ErrorBox message={loadError}/> : <div className="center-block"><Spinner/></div>}
            </div>
        );
    }

    const busy = submitting || deleting;
    const prices = ticketTypes
        .filter((t) => t.price.trim() !== "")
        .map((t) => Number(t.price))
        .filter((p) => !Number.isNaN(p));

    return (
        <form className="container section editor" onSubmit={handleSubmit} noValidate>
            <Link to={backTo} className="back-link">
                <Icon name="arrowLeft" size={18}/> Your events
            </Link>
            <div className="page-header-row">
                <div>
                    <h1>{isEdit ? "Edit event" : "Create an event"}</h1>
                    {loaded && (
                        <p className="page-subtitle">
                            Created {formatDate(loaded.createdAt)} · Updated {formatDate(loaded.updatedAt)}
                        </p>
                    )}
                </div>
            </div>

            <div className="editor-layout">
                <fieldset className="editor-main" disabled={busy}>
                    <Section icon="sparkles" title="Basics" hint="What attendees see first.">
                        <div className="field">
                            <label htmlFor="ev-name">Event name</label>
                            <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)}
                                   placeholder="e.g. Summer Rooftop Party" aria-invalid={!!show("name")}/>
                            {show("name") && <p className="field-error">{show("name")}</p>}
                        </div>
                        <div className="field">
                            <label htmlFor="ev-venue">Venue</label>
                            <div className="input-with-icon">
                                <Icon name="pin" size={18}/>
                                <input id="ev-venue" value={venue} onChange={(e) => setVenue(e.target.value)}
                                       placeholder="Name and address" aria-invalid={!!show("venue")}/>
                            </div>
                            {show("venue") && <p className="field-error">{show("venue")}</p>}
                        </div>
                    </Section>

                    <Section icon="calendar" title="Date & time">
                        <div className="field-grid">
                            <div className="field">
                                <label htmlFor="ev-start">Starts</label>
                                <input id="ev-start" type="datetime-local" value={start}
                                       onChange={(e) => setStart(e.target.value)} aria-invalid={!!show("start")}/>
                                {show("start") && <p className="field-error">{show("start")}</p>}
                            </div>
                            <div className="field">
                                <label htmlFor="ev-end">Ends</label>
                                <input id="ev-end" type="datetime-local" value={end} min={start || undefined}
                                       onChange={(e) => setEnd(e.target.value)} aria-invalid={!!show("end")}/>
                                {show("end") && <p className="field-error">{show("end")}</p>}
                            </div>
                        </div>
                    </Section>

                    <Section icon="clock" title="Ticket sales" hint="Optional. When attendees can buy tickets.">
                        <div className="field-grid">
                            <div className="field">
                                <label htmlFor="ev-sales-start">Sales open</label>
                                <input id="ev-sales-start" type="datetime-local" value={salesStart}
                                       onChange={(e) => setSalesStart(e.target.value)}/>
                            </div>
                            <div className="field">
                                <label htmlFor="ev-sales-end">Sales close</label>
                                <input id="ev-sales-end" type="datetime-local" value={salesEnd}
                                       min={salesStart || undefined} onChange={(e) => setSalesEnd(e.target.value)}
                                       aria-invalid={!!show("salesEnd")}/>
                                {show("salesEnd") && <p className="field-error">{show("salesEnd")}</p>}
                            </div>
                        </div>
                    </Section>

                    <Section icon="ticket" title="Tickets" hint="Leave the quantity empty for unlimited tickets.">
                        <div className="tt-list">
                            {ticketTypes.map((t, i) => (
                                <div key={t.key} className="tt-card">
                                    <div className="tt-card-head">
                                        <span className="tt-index">{i + 1}</span>
                                        <strong>{t.name.trim() || "New ticket type"}</strong>
                                        {ticketTypes.length > 1 && (
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => setTicketTypes((list) => list.filter((_, j) => j !== i))}
                                                aria-label={`Remove ticket type ${t.name || i + 1}`}
                                            >
                                                <Icon name="trash" size={18}/>
                                            </button>
                                        )}
                                    </div>
                                    <div className="field-grid tt-grid">
                                        <div className="field tt-name">
                                            <label htmlFor={`tt-name-${t.key}`}>Name</label>
                                            <input id={`tt-name-${t.key}`} value={t.name}
                                                   onChange={(e) => updateTicketType(i, "name", e.target.value)}
                                                   placeholder="e.g. Early bird, VIP"
                                                   aria-invalid={!!show(`tt-name-${i}`)}/>
                                            {show(`tt-name-${i}`) &&
                                                <p className="field-error">{show(`tt-name-${i}`)}</p>}
                                        </div>
                                        <div className="field">
                                            <label htmlFor={`tt-price-${t.key}`}>Price</label>
                                            <div className="input-with-affix">
                                                <span>€</span>
                                                <input id={`tt-price-${t.key}`} type="number" inputMode="decimal"
                                                       min="0" step="0.01" value={t.price}
                                                       onChange={(e) => updateTicketType(i, "price", e.target.value)}
                                                       placeholder="0.00" aria-invalid={!!show(`tt-price-${i}`)}/>
                                            </div>
                                            {show(`tt-price-${i}`) &&
                                                <p className="field-error">{show(`tt-price-${i}`)}</p>}
                                        </div>
                                        <div className="field">
                                            <label htmlFor={`tt-total-${t.key}`}>Quantity</label>
                                            <input id={`tt-total-${t.key}`} type="number" inputMode="numeric" min="1"
                                                   step="1" value={t.totalAvailable}
                                                   onChange={(e) => updateTicketType(i, "totalAvailable", e.target.value)}
                                                   placeholder="Unlimited" aria-invalid={!!show(`tt-total-${i}`)}/>
                                            {show(`tt-total-${i}`) &&
                                                <p className="field-error">{show(`tt-total-${i}`)}</p>}
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label htmlFor={`tt-desc-${t.key}`}>Description <span
                                            className="muted">(optional)</span></label>
                                        <textarea id={`tt-desc-${t.key}`} rows={2} value={t.description}
                                                  onChange={(e) => updateTicketType(i, "description", e.target.value)}
                                                  placeholder="What's included?"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" className="btn btn-dashed btn-block"
                                onClick={() => setTicketTypes((list) => [...list, emptyTicketType()])}>
                            <Icon name="plus" size={18}/> Add ticket type
                        </button>
                        {removedExisting.length > 0 && (
                            <div className="alert alert-warning">
                                <Icon name="alert" size={18}/>
                                <p>
                                    Saving deletes {removedExisting.map((t) => `“${t.name}”`).join(", ")}.
                                </p>
                            </div>
                        )}
                    </Section>

                    <Section icon="eye" title="Visibility">
                        <div className="status-options" role="radiogroup" aria-label="Status">
                            {STATUS_OPTIONS.map((o) => (
                                <label key={o.value}
                                       className={`status-option${status === o.value ? " selected" : ""}`}>
                                    <input type="radio" name="status" value={o.value} checked={status === o.value}
                                           onChange={() => setStatus(o.value)}/>
                                    <span className="radio-dot" aria-hidden="true"/>
                                    <span>
                    <strong>{o.title}</strong>
                    <span className="muted small">{o.text}</span>
                  </span>
                                </label>
                            ))}
                        </div>
                    </Section>

                    {isEdit && (
                        <section className="card danger-zone">
                            <div>
                                <h2>Delete event</h2>
                                <p className="muted small">Removes the event and all its ticket types.</p>
                            </div>
                            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy}>
                                {deleting ? <Spinner/> : <Icon name="trash" size={18}/>} Delete
                            </button>
                        </section>
                    )}
                </fieldset>

                {/* Live preview of the public card (desktop) */}
                <aside className="editor-preview" aria-label="Preview">
                    <p className="eyebrow">Preview</p>
                    <div className="preview-card card">
                        {/* Same seed as the saved event will use, so the art doesn't jump while typing. */}
                        <EventCover seed={eventId ?? "new-event"} className="preview-cover"/>
                        <div className="preview-body">
                            <Chip tone={eventStatusTone[status]}>{EVENT_STATUS_LABEL[status]}</Chip>
                            <h3>{name.trim() || "Your event name"}</h3>
                            <p className="meta">
                                <Icon name="calendar" size={15}/> {formatWhen(orNull(start), orNull(end))}
                            </p>
                            <p className="meta">
                                <Icon name="pin" size={15}/> {venue.trim() || "Venue"}
                            </p>
                            <p className="meta">
                                <Icon name="ticket" size={15}/>
                                {prices.length ? `From ${formatPriceOrFree(Math.min(...prices))}` : "No tickets"}
                            </p>
                        </div>
                    </div>
                </aside>
            </div>

            {error && <ErrorBox message={error}/>}

            <div className="action-bar">
                <div className="container action-bar-inner">
                    <Link to={backTo} className="btn btn-ghost">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
                        {submitting ? <Spinner/> : <Icon name="check" size={18}/>}
                        {isEdit ? "Save changes" : status === "PUBLISHED" ? "Publish event" : "Save draft"}
                    </button>
                </div>
            </div>
        </form>
    );
}
