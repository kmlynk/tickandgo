import {useEffect, useMemo, useState} from "react";
import {useAuth} from "react-oidc-context";
import {Link, useParams} from "react-router";
import {ErrorBox, Spinner} from "../../components/common";
import EventCover from "../../components/EventCover";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";
import {useToast} from "../../components/Toast";
import {getPublishedEvent, purchaseTickets} from "../../lib/api";
import {useLogin} from "../../lib/auth";
import {downloadIcs, mapsUrl} from "../../lib/calendar";
import {errorText, formatPrice, formatPriceOrFree, formatWhen, isPast, relativeTime} from "../../lib/format";
import {useNavState} from "../../lib/navigation";
import type {PublishedEventDetailsResponse} from "../../lib/types";

const MAX_QUANTITY = 10;

/** Selection kept across the Keycloak login, so the buyer continues where they left off. */
const pendingKey = (eventId: string) => `tickandgo.pending-order.${eventId}`;

interface PendingOrder {
    ticketTypeId: string;
    quantity: number;
}

function readPending(eventId: string): PendingOrder | undefined {
    try {
        const raw = sessionStorage.getItem(pendingKey(eventId));
        sessionStorage.removeItem(pendingKey(eventId));
        return raw ? (JSON.parse(raw) as PendingOrder) : undefined;
    } catch {
        return undefined;
    }
}

function savePending(eventId: string, order: PendingOrder) {
    try {
        sessionStorage.setItem(pendingKey(eventId), JSON.stringify(order));
    } catch {
        // Storage blocked: the buyer picks the ticket again after login.
    }
}

async function share(title: string, toast: ReturnType<typeof useToast>) {
    const url = window.location.href;
    try {
        if (navigator.share) {
            await navigator.share({title, url});
            return;
        }
        await navigator.clipboard.writeText(url);
        toast("Link copied to clipboard", "info");
    } catch {
        // Share sheet dismissed.
    }
}

/** /events/:eventId : public event page where attendees buy tickets. */
export default function EventPage() {
    const {eventId = ""} = useParams();
    const backTo = useNavState().from ?? "/";
    const auth = useAuth();
    const login = useLogin();
    const toast = useToast();

    const [event, setEvent] = useState<PublishedEventDetailsResponse>();
    const [error, setError] = useState<string>();
    const [reloadKey, setReloadKey] = useState(0);

    const [selectedId, setSelectedId] = useState<string>();
    const [quantity, setQuantity] = useState(1);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [buying, setBuying] = useState(false);
    const [buyError, setBuyError] = useState<string>();
    const [success, setSuccess] = useState<{ bought: number; ticketName: string; warning?: string }>();

    useEffect(() => {
        let cancelled = false;
        setEvent(undefined);
        setError(undefined);
        getPublishedEvent(eventId)
            .then((e) => {
                if (cancelled) return;
                setEvent(e);
                // Preselect the cheapest ticket, or restore the order started before login.
                const pending = auth.isAuthenticated ? readPending(eventId) : undefined;
                const restored = pending && e.ticketTypes.find((t) => t.id === pending.ticketTypeId);
                if (restored) {
                    setSelectedId(restored.id);
                    setQuantity(Math.min(MAX_QUANTITY, Math.max(1, pending.quantity)));
                    setConfirmOpen(true);
                } else if (e.ticketTypes.length > 0) {
                    setSelectedId([...e.ticketTypes].sort((a, b) => a.price - b.price)[0]!.id);
                }
            })
            .catch((err) => !cancelled && setError(errorText(err)));
        return () => {
            cancelled = true;
        };
        // auth.isAuthenticated is read once on load on purpose.
    }, [eventId, reloadKey]);

    const selected = useMemo(() => event?.ticketTypes.find((t) => t.id === selectedId), [event, selectedId]);
    const total = selected ? selected.price * quantity : 0;

    if (error) {
        return (
            <div className="container narrow section">
                <Link to={backTo} className="back-link">
                    <Icon name="arrowLeft" size={18}/> Back
                </Link>
                <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)}/>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="center-screen">
                <Spinner/>
            </div>
        );
    }

    const over = isPast(event.start, event.end);
    const canBuy = !over && event.ticketTypes.length > 0;
    const fromPrice = event.ticketTypes.length ? Math.min(...event.ticketTypes.map((t) => t.price)) : undefined;
    const soon = event.start && new Date(event.start).getTime() > Date.now() ? relativeTime(event.start) : null;

    const startCheckout = () => {
        if (!selected) return;
        setBuyError(undefined);
        if (!auth.isAuthenticated) {
            savePending(event.id, {ticketTypeId: selected.id, quantity});
            login();
            return;
        }
        setConfirmOpen(true);
    };

    const confirm = async () => {
        if (!selected || !auth.user) return;
        setBuying(true);
        setBuyError(undefined);
        try {
            const result = await purchaseTickets(auth.user.access_token, event.id, selected.id, quantity);
            setConfirmOpen(false);
            setSuccess({
                bought: result.bought,
                ticketName: selected.name,
                warning: result.error ? `Only ${result.bought} of ${quantity} could be bought: ${result.error}` : undefined,
            });
        } catch (err) {
            setBuyError(errorText(err));
        } finally {
            setBuying(false);
        }
    };

    const addToCalendar = () =>
        downloadIcs({
            id: event.id,
            title: event.name,
            start: event.start,
            end: event.end,
            location: event.venue,
            url: window.location.href,
        });

    return (
        <div className="event-page">
            <EventCover seed={event.id} className="event-hero">
                <div className="container event-hero-inner">
                    <Link to={backTo} className="glass-button" aria-label="Back">
                        <Icon name="arrowLeft" size={20}/>
                    </Link>
                    <button type="button" className="glass-button" onClick={() => share(event.name, toast)}
                            aria-label="Share">
                        <Icon name="share" size={20}/>
                    </button>
                </div>
            </EventCover>

            <div className="container event-layout">
                <div className="event-main">
                    <div className="event-title-card card">
                        {soon && <span className="chip chip-brand">{soon}</span>}
                        {over && <span className="chip chip-neutral">Event ended</span>}
                        <h1>{event.name}</h1>

                        <ul className="info-list">
                            <li>
                <span className="info-icon">
                  <Icon name="calendar"/>
                </span>
                                <div>
                                    <strong>{formatWhen(event.start, event.end)}</strong>
                                    {event.start && !over && (
                                        <button type="button" className="link-button" onClick={addToCalendar}>
                                            Add to calendar
                                        </button>
                                    )}
                                </div>
                            </li>
                            <li>
                <span className="info-icon">
                  <Icon name="pin"/>
                </span>
                                <div>
                                    <strong>{event.venue}</strong>
                                    <a href={mapsUrl(event.venue)} target="_blank" rel="noreferrer"
                                       className="link-button">
                                        Get directions
                                    </a>
                                </div>
                            </li>
                            {fromPrice !== undefined && (
                                <li>
                  <span className="info-icon">
                    <Icon name="ticket"/>
                  </span>
                                    <div>
                                        <strong>{fromPrice === 0 ? "Free entry available" : `From ${formatPrice(fromPrice)}`}</strong>
                                        <span className="muted">
                      {event.ticketTypes.length} ticket type{event.ticketTypes.length === 1 ? "" : "s"}
                    </span>
                                    </div>
                                </li>
                            )}
                        </ul>
                    </div>

                    <section className="card" aria-labelledby="tickets-title">
                        <h2 id="tickets-title" className="card-title">
                            Tickets
                        </h2>
                        {event.ticketTypes.length === 0 ? (
                            <p className="muted">Tickets aren't on sale yet. Check back later.</p>
                        ) : (
                            <div className="ticket-options" role="radiogroup" aria-label="Ticket type">
                                {event.ticketTypes.map((t) => {
                                    const checked = t.id === selectedId;
                                    return (
                                        <label key={t.id}
                                               className={`ticket-option${checked ? " selected" : ""}${over ? " disabled" : ""}`}>
                                            <input
                                                type="radio"
                                                name="ticket-type"
                                                value={t.id}
                                                checked={checked}
                                                disabled={over}
                                                onChange={() => {
                                                    setSelectedId(t.id);
                                                    setQuantity(1);
                                                }}
                                            />
                                            <span className="radio-dot" aria-hidden="true"/>
                                            <span className="ticket-option-text">
                        <strong>{t.name}</strong>
                                                {t.description && <span className="muted">{t.description}</span>}
                      </span>
                                            <span className="ticket-option-price">{formatPriceOrFree(t.price)}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {over &&
                            <p className="muted small">This event has ended, so tickets can't be bought anymore.</p>}
                    </section>

                    <section className="card">
                        <h2 className="card-title">Good to know</h2>
                        <ul className="perks">
                            <li>
                                <Icon name="qr" size={18}/> Mobile ticket — show the QR code on your phone at the
                                entrance
                            </li>
                            <li>
                                <Icon name="shield" size={18}/> Each ticket is checked once; don't share your code
                            </li>
                            <li>
                                <Icon name="euro" size={18}/> All prices in EUR, including fees
                            </li>
                        </ul>
                    </section>
                </div>

                {/* Order summary: a sticky side card on desktop, a bottom bar on phones */}
                {canBuy && selected && (
                    <aside className="buy-panel" aria-label="Your order">
                        <div className="buy-panel-row buy-panel-ticket">
                            <div>
                                <span className="muted small">Selected</span>
                                <strong>{selected.name}</strong>
                            </div>
                            <div className="stepper" aria-label="Quantity">
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    aria-label="Fewer tickets"
                                >
                                    <Icon name="minus" size={16}/>
                                </button>
                                <span aria-live="polite">{quantity}</span>
                                <button
                                    type="button"
                                    onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                                    disabled={quantity >= MAX_QUANTITY}
                                    aria-label="More tickets"
                                >
                                    <Icon name="plus" size={16}/>
                                </button>
                            </div>
                        </div>
                        <div className="buy-panel-row">
                            <div>
                                <span className="muted small">Total</span>
                                <strong className="buy-total">{formatPriceOrFree(total)}</strong>
                            </div>
                            <button type="button" className="btn btn-primary btn-lg" onClick={startCheckout}>
                                {auth.isAuthenticated ? "Get tickets" : "Log in to buy"}
                            </button>
                        </div>
                    </aside>
                )}
            </div>

            {confirmOpen && selected && (
                <Sheet
                    title="Confirm your order"
                    onClose={() => !buying && setConfirmOpen(false)}
                    footer={
                        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={confirm}
                                disabled={buying}>
                            {buying ? (
                                <>
                                    <Spinner/> Processing…
                                </>
                            ) : (
                                `Confirm order · ${formatPriceOrFree(total)}`
                            )}
                        </button>
                    }
                >
                    <div className="order-summary">
                        <p className="order-event">{event.name}</p>
                        <p className="muted small">
                            {formatWhen(event.start, event.end)} · {event.venue}
                        </p>
                        <dl className="order-lines">
                            <div>
                                <dt>
                                    {quantity} × {selected.name}
                                </dt>
                                <dd>{formatPriceOrFree(total)}</dd>
                            </div>
                            <div className="order-total">
                                <dt>Total</dt>
                                <dd>{formatPriceOrFree(total)}</dd>
                            </div>
                        </dl>
                        <p className="muted small">
                            Your ticket{quantity > 1 ? "s" : ""} will appear in My tickets with a QR code for entry.
                        </p>
                        {buyError && <ErrorBox message={buyError}/>}
                    </div>
                </Sheet>
            )}

            {success && (
                <Sheet title="You're going!" onClose={() => setSuccess(undefined)}>
                    <div className="success">
                        <div className="success-icon">
                            <Icon name="check" size={36}/>
                        </div>
                        <h3>
                            {success.bought} × {success.ticketName}
                        </h3>
                        <p className="muted">
                            {event.name} · {formatWhen(event.start, event.end)}
                        </p>
                        {success.warning && <div className="alert alert-warning">{success.warning}</div>}
                        <div className="stack">
                            <Link to="/tickets" className="btn btn-primary btn-lg btn-block">
                                <Icon name="qr" size={18}/> View my tickets
                            </Link>
                            {event.start && (
                                <button type="button" className="btn btn-secondary btn-block" onClick={addToCalendar}>
                                    <Icon name="calendarPlus" size={18}/> Add to calendar
                                </button>
                            )}
                        </div>
                    </div>
                </Sheet>
            )}
        </div>
    );
}
