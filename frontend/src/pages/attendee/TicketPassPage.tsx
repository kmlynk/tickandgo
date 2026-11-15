import {useEffect, useState} from "react";
import {Link, useParams} from "react-router";
import {ErrorBox, Spinner} from "../../components/common";
import Icon from "../../components/Icon";
import {getTicket, getTicketQrCode} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {coverFor} from "../../lib/cover";
import {errorText, formatDay, formatPriceOrFree, formatTime, ticketCode} from "../../lib/format";
import {useNavState} from "../../lib/navigation";
import {TICKET_STATUS_LABEL} from "../../lib/ticketStatus";
import type {TicketDetailsResponse} from "../../lib/types";
import {useWakeLock} from "../../lib/useWakeLock";

/** Ticks every second; drives the live clock that shows the pass isn't a screenshot. */
function useNow() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(timer);
    }, []);
    return now;
}

/**
 * /tickets/:ticketId/qr : full-screen mobile pass with the entry QR code,
 * rendered outside the normal layout like the pass view of a ticketing app.
 */
export default function TicketPassPage() {
    const accessToken = useAccessToken();
    const {ticketId = ""} = useParams();
    const backTo = useNavState().from ?? "/tickets";
    const now = useNow();
    useWakeLock();

    const [ticket, setTicket] = useState<TicketDetailsResponse>();
    const [ticketError, setTicketError] = useState<string>();
    const [qrUrl, setQrUrl] = useState<string>();
    const [qrError, setQrError] = useState<string>();

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | undefined;
        setTicket(undefined);
        setTicketError(undefined);
        setQrUrl(undefined);
        setQrError(undefined);

        getTicket(accessToken, ticketId)
            .then((t) => !cancelled && setTicket(t))
            .catch((err) => !cancelled && setTicketError(errorText(err)));

        // The image needs the token, so it's fetched and shown through an object URL.
        getTicketQrCode(accessToken, ticketId)
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setQrUrl(objectUrl);
            })
            .catch((err) => !cancelled && setQrError(errorText(err)));

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [accessToken, ticketId]);

    const topBar = (
        <div className="pass-topbar">
            <Link to={backTo} className="glass-button" aria-label="Close">
                <Icon name="x" size={20}/>
            </Link>
            <span className="pass-brand">Tick&amp;Go</span>
            <Link to={`/tickets/${ticketId}`} state={{from: backTo}} className="glass-button"
                  aria-label="Ticket details">
                <Icon name="info" size={20}/>
            </Link>
        </div>
    );

    if (ticketError || !ticket) {
        return (
            <div className="pass-screen">
                {topBar}
                <div className="pass-message">{ticketError ? <ErrorBox message={ticketError}/> : <Spinner/>}</div>
            </div>
        );
    }

    const status = ticket.status;
    const usable = status === "PURCHASED";
    const cover = coverFor(ticket.eventName ?? ticket.id);
    const clock = now.toLocaleTimeString(undefined, {hour: "2-digit", minute: "2-digit", second: "2-digit"});

    return (
        <div className="pass-screen">
            {topBar}

            <article className={`pass pass-${status.toLowerCase()}`} aria-label="Ticket">
                <header className="pass-header"
                        style={{background: `linear-gradient(${cover.angle}deg, ${cover.from}, ${cover.to})`}}>
                    <div className="pass-header-row">
                        <span className="pass-label-light">Admit one</span>
                        <span
                            className={`pass-status pass-status-${status.toLowerCase()}`}>{TICKET_STATUS_LABEL[status]}</span>
                    </div>
                    <h1 className="pass-event">{ticket.eventName ?? "Event"}</h1>
                    {ticket.eventVenue && (
                        <p className="pass-venue">
                            <Icon name="pin" size={15}/> {ticket.eventVenue}
                        </p>
                    )}
                </header>

                <div className="pass-facts">
                    <div>
                        <span className="pass-label">Date</span>
                        <strong>{formatDay(ticket.eventStart)}</strong>
                    </div>
                    <div>
                        <span className="pass-label">Starts</span>
                        <strong>{formatTime(ticket.eventStart)}</strong>
                    </div>
                    <div>
                        <span className="pass-label">Ends</span>
                        <strong>{formatTime(ticket.eventEnd)}</strong>
                    </div>
                    <div>
                        <span className="pass-label">Price</span>
                        <strong>{formatPriceOrFree(ticket.price)}</strong>
                    </div>
                    {ticket.description && (
                        <div className="pass-facts-wide">
                            <span className="pass-label">Ticket</span>
                            <strong>{ticket.description}</strong>
                        </div>
                    )}
                </div>

                <div className="pass-perforation" aria-hidden="true"/>

                <div className="pass-scan">
                    <div className="pass-qr-frame">
                        {qrUrl ? (
                            <img src={qrUrl} alt={`QR code for ticket ${ticketCode(ticket.id)}`} className="pass-qr"/>
                        ) : qrError ? (
                            <div className="pass-qr-placeholder">
                                <span>QR code unavailable</span>
                                <small>{qrError}</small>
                            </div>
                        ) : (
                            <div className="pass-qr-placeholder skeleton" aria-label="Loading QR code"/>
                        )}
                        {!usable && <div className="pass-stamp">{TICKET_STATUS_LABEL[status]}</div>}
                    </div>

                    <p className="pass-code">{ticketCode(ticket.id)}</p>

                    {/* Moving strip + live clock: shows staff this is the live pass, not a screenshot. */}
                    {usable && (
                        <div className="pass-live" aria-label={`Live ticket, ${clock}`}>
                            <span className="pass-live-dot"/> Live ticket · {clock}
                        </div>
                    )}

                    <p className="pass-hint">
                        {usable
                            ? "Turn up your screen brightness and hold the code flat to the scanner. Screenshots may not be accepted."
                            : status === "USED"
                                ? "This ticket has already been scanned at the entrance."
                                : "This ticket was cancelled and isn't valid for entry."}
                    </p>
                </div>

                <footer className="pass-footer">
                    <span className="pass-label">Ticket ID</span>
                    <span className="mono">{ticket.id}</span>
                </footer>
            </article>
        </div>
    );
}
