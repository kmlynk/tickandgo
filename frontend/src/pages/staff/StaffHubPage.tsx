import {useState, type FormEvent} from "react";
import {Link} from "react-router";
import {PageHeader, Spinner} from "../../components/common";
import Icon from "../../components/Icon";
import {validateTicket} from "../../lib/api";
import {useAccessToken} from "../../lib/auth";
import {errorText, ticketCode} from "../../lib/format";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = { tone: "success" | "danger" | "warning" | "neutral"; title: string; text: string };

/** /staff : check-in hub. Opens the scanner, or checks a ticket ID typed at a desk. */
export default function StaffHubPage() {
    const accessToken = useAccessToken();
    const [ticketId, setTicketId] = useState("");
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState<Result>();

    const check = async (e: FormEvent) => {
        e.preventDefault();
        const id = ticketId.trim();
        setResult(undefined);
        if (!UUID_RE.test(id)) {
            setResult({
                tone: "neutral",
                title: "Not a ticket ID",
                text: "A ticket ID looks like 3f2a9c1b-…-… (36 characters)."
            });
            return;
        }
        setChecking(true);
        try {
            const r = await validateTicket(accessToken, id, "MANUAL");
            const code = ticketCode(r.ticketId);
            setResult(
                r.status === "VALID"
                    ? {tone: "success", title: "Admit", text: `Ticket ${code} is valid and is now checked in.`}
                    : r.status === "EXPIRED"
                        ? {tone: "warning", title: "Expired", text: `Ticket ${code}: the event is over or was cancelled.`}
                        : {
                            tone: "danger",
                            title: "Rejected",
                            text: `Ticket ${code} was already used or has been cancelled.`
                        },
            );
            setTicketId("");
        } catch (err) {
            const message = errorText(err);
            setResult(
                /not found/i.test(message)
                    ? {tone: "danger", title: "Unknown ticket", text: "No ticket with this ID exists."}
                    : {tone: "neutral", title: "Couldn't check ticket", text: message},
            );
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="container narrow section">
            <PageHeader title="Check-in" subtitle="Validate tickets at the entrance."/>

            <Link to="/staff/scan" className="scan-cta">
        <span className="scan-cta-icon">
          <Icon name="scan" size={34}/>
        </span>
                <span className="scan-cta-text">
          <strong>Start scanning</strong>
          <span>Use the camera to scan attendees' QR codes</span>
        </span>
                <Icon name="chevronRight" size={22}/>
            </Link>

            <section className="card">
                <h2 className="card-title">Manual check</h2>
                <p className="muted small">For when a code won't scan. The ticket ID is printed at the bottom of the
                    attendee's pass.</p>
                <form className="inline-form" onSubmit={check}>
                    <input
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value)}
                        placeholder="Ticket ID"
                        aria-label="Ticket ID"
                        className="mono"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                    />
                    <button type="submit" className="btn btn-primary" disabled={checking || !ticketId.trim()}>
                        {checking ? <Spinner/> : "Check"}
                    </button>
                </form>
                {result && (
                    <div className={`check-result tone-${result.tone}`} role="status">
                        <Icon name={result.tone === "success" ? "check" : result.tone === "neutral" ? "info" : "x"}
                              size={22}/>
                        <div>
                            <strong>{result.title}</strong>
                            <p>{result.text}</p>
                        </div>
                    </div>
                )}
            </section>

            <section className="card">
                <h2 className="card-title">Before doors open</h2>
                <ul className="perks">
                    <li>
                        <Icon name="camera" size={18}/> Allow camera access when the scanner asks
                    </li>
                    <li>
                        <Icon name="flashlight" size={18}/> In dark venues, turn on the flashlight in the scanner
                    </li>
                    <li>
                        <Icon name="shield" size={18}/> Green means admit. Red or orange: don't let them in
                    </li>
                    <li>
                        <Icon name="history" size={18}/> Each ticket is valid once — a second scan is rejected
                    </li>
                </ul>
            </section>
        </div>
    );
}
