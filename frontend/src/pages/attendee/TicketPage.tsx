import {useEffect, useState} from "react";
import {Link, useParams} from "react-router";
import {Chip, ErrorBox, Spinner} from "../../components/common";
import EventCover from "../../components/EventCover";
import Icon from "../../components/Icon";
import {useToast} from "../../components/Toast";
import {getTicket} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {downloadIcs, mapsUrl} from "../../lib/calendar";
import {errorText, formatPriceOrFree, formatWhen, isPast, ticketCode} from "../../lib/format";
import {useNavState, type NavState} from "../../lib/navigation";
import {TICKET_STATUS_LABEL} from "../../lib/ticketStatus";
import type {TicketDetailsResponse} from "../../lib/types";

const statusTone = {PURCHASED: "success", USED: "neutral", CANCELLED: "danger"} as const;

/** /tickets/:ticketId : details of one purchased ticket. */
export default function TicketPage() {
    const accessToken = useAccessToken();
    const toast = useToast();
    const {ticketId = ""} = useParams();
    const backTo = useNavState().from ?? "/tickets";
    const [ticket, setTicket] = useState<TicketDetailsResponse>();
    const [error, setError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        setTicket(undefined);
        setError(undefined);
        getTicket(accessToken, ticketId)
            .then((t) => !cancelled && setTicket(t))
            .catch((err) => !cancelled && setError(errorText(err)));
        return () => {
            cancelled = true;
        };
    }, [accessToken, ticketId]);

    if (error || !ticket) {
        return (
            <div className="container narrow section">
                <Link to={backTo} className="back-link">
                    <Icon name="arrowLeft" size={18}/> My tickets
                </Link>
                {error ? <ErrorBox message={error}/> : <div className="center-block"><Spinner/></div>}
            </div>
        );
    }

    const usable = ticket.status === "PURCHASED" && !isPast(ticket.eventStart, ticket.eventEnd);
    const copyId = async () => {
        try {
            await navigator.clipboard.writeText(ticket.id);
            toast("Ticket ID copied", "info");
        } catch {
            // Clipboard blocked.
        }
    };

    return (
        <div className="container narrow section">
            <Link to={backTo} className="back-link">
                <Icon name="arrowLeft" size={18}/> My tickets
            </Link>

            <article className="ticket-detail card">
                <EventCover seed={ticket.eventName ?? ticket.id} className="ticket-detail-cover">
                    <div className="ticket-detail-cover-text">
                        <span className="eyebrow">Ticket {ticketCode(ticket.id)}</span>
                        <h1>{ticket.eventName ?? "Event"}</h1>
                    </div>
                </EventCover>

                <div className="ticket-detail-body">
                    <div className="row-between">
                        <Chip tone={statusTone[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Chip>
                        <span className="ticket-detail-price">{formatPriceOrFree(ticket.price)}</span>
                    </div>

                    <ul className="info-list">
                        <li>
              <span className="info-icon">
                <Icon name="calendar"/>
              </span>
                            <div>
                                <strong>{formatWhen(ticket.eventStart, ticket.eventEnd)}</strong>
                                {ticket.eventStart && usable && (
                                    <button
                                        type="button"
                                        className="link-button"
                                        onClick={() =>
                                            downloadIcs({
                                                id: ticket.id,
                                                title: ticket.eventName ?? "Event",
                                                start: ticket.eventStart,
                                                end: ticket.eventEnd,
                                                location: ticket.eventVenue,
                                            })
                                        }
                                    >
                                        Add to calendar
                                    </button>
                                )}
                            </div>
                        </li>
                        {ticket.eventVenue && (
                            <li>
                <span className="info-icon">
                  <Icon name="pin"/>
                </span>
                                <div>
                                    <strong>{ticket.eventVenue}</strong>
                                    <a href={mapsUrl(ticket.eventVenue)} target="_blank" rel="noreferrer"
                                       className="link-button">
                                        Get directions
                                    </a>
                                </div>
                            </li>
                        )}
                        {ticket.description && (
                            <li>
                <span className="info-icon">
                  <Icon name="ticket"/>
                </span>
                                <div>
                                    <strong>What's included</strong>
                                    <span className="muted">{ticket.description}</span>
                                </div>
                            </li>
                        )}
                    </ul>

                    <div className="ticket-id-row">
                        <div>
                            <span className="muted small">Ticket ID</span>
                            <span className="mono small">{ticket.id}</span>
                        </div>
                        <button type="button" className="icon-button" onClick={copyId} aria-label="Copy ticket ID">
                            <Icon name="copy" size={18}/>
                        </button>
                    </div>

                    <Link
                        to={`/tickets/${ticket.id}/qr`}
                        state={{from: backTo} satisfies NavState}
                        className={`btn btn-lg btn-block ${usable ? "btn-primary" : "btn-secondary"}`}
                    >
                        <Icon name="qr" size={20}/> {usable ? "Show QR code for entry" : "View QR code"}
                    </Link>
                    <p className="muted small center-text">
                        {usable
                            ? "Each ticket admits one person and is checked once."
                            : ticket.status === "PURCHASED"
                                ? "This event is over."
                                : `This ticket is ${TICKET_STATUS_LABEL[ticket.status].toLowerCase()} and can't be used for entry.`}
                    </p>
                </div>
            </article>
        </div>
    );
}
