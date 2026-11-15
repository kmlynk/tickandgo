import type {LocalDateTime} from "./types";

interface CalendarEvent {
    id: string;
    title: string;
    start: LocalDateTime | null;
    end: LocalDateTime | null;
    location?: string | null;
    description?: string;
    url?: string;
}

// Floating local time ("20261214T200000"), matching the backend's zone-less LocalDateTime.
const icsDate = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}` +
    `T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;

const escapeIcs = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");

/** Downloads an .ics file that opens in Apple/Google/Outlook calendars. */
export function downloadIcs(event: CalendarEvent) {
    if (!event.start) return;
    const start = new Date(event.start);
    // Without an end, assume three hours.
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 3 * 3600_000);
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TickAndGo//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${event.id}@tickandgo`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${escapeIcs(event.title)}`,
        event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
        event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
        event.url ? `URL:${event.url}` : "",
        "END:VEVENT",
        "END:VCALENDAR",
    ].filter(Boolean);

    const blob = new Blob([lines.join("\r\n")], {type: "text/calendar;charset=utf-8"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${event.title.replace(/[^\w\- ]+/g, "").trim() || "event"}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Google Maps search for a venue (opens the Maps app on phones). */
export const mapsUrl = (venue: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`;
