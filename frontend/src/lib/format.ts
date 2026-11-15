import type {LocalDateTime} from "./types";

/** The backend sends LocalDateTime without a zone; the browser reads it as local time. */
export const toDate = (value: LocalDateTime | null | undefined) => (value ? new Date(value) : null);

export const formatDate = (value: LocalDateTime | null) =>
    value
        ? new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"})
        : "–";

/** "Sat, 14 Dec 2026" */
export const formatDay = (value: LocalDateTime | null) =>
    value
        ? new Date(value).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
        })
        : "Date TBA";

/** "20:00" */
export const formatTime = (value: LocalDateTime | null) =>
    value ? new Date(value).toLocaleTimeString(undefined, {timeStyle: "short"}) : "–";

/** "Sat, 14 Dec · 20:00 – 23:30", spanning days when needed. */
export function formatWhen(start: LocalDateTime | null, end: LocalDateTime | null): string {
    if (!start && !end) return "Date to be announced";
    if (!start) return `Until ${formatDate(end)}`;
    const s = new Date(start);
    const day = s.toLocaleDateString(undefined, {weekday: "short", day: "numeric", month: "short"});
    if (!end) return `${day} · ${formatTime(start)}`;
    const e = new Date(end);
    const sameDay = s.toDateString() === e.toDateString();
    return sameDay
        ? `${day} · ${formatTime(start)} – ${formatTime(end)}`
        : `${day} ${formatTime(start)} – ${e.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
        })} ${formatTime(end)}`;
}

export const formatRange = (from: LocalDateTime | null, to: LocalDateTime | null) =>
    from || to ? `${formatDate(from)} → ${formatDate(to)}` : "Not set";

/** Parts for a calendar-style date badge. */
export function dateBadge(value: LocalDateTime | null) {
    if (!value) return null;
    const d = new Date(value);
    return {
        day: d.getDate(),
        month: d.toLocaleDateString(undefined, {month: "short"}).replace(".", ""),
        weekday: d.toLocaleDateString(undefined, {weekday: "short"}),
    };
}

/** "in 3 days", "tomorrow", "2 hours ago" */
export function relativeTime(value: LocalDateTime | null): string | null {
    if (!value) return null;
    const diffMs = new Date(value).getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat(undefined, {numeric: "auto"});
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(hours, "hour");
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(days, "day");
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(months, "month");
    return rtf.format(Math.round(months / 12), "year");
}

const euro = new Intl.NumberFormat(undefined, {style: "currency", currency: "EUR"});

/** All prices are in euros. */
export const formatPrice = (price: number) => euro.format(price);

export const formatPriceOrFree = (price: number | null | undefined) =>
    price == null ? "–" : price === 0 ? "Free" : euro.format(price);

/** Short, human-readable ticket code from its UUID, e.g. "3F2A-9C1B". */
export const ticketCode = (id: string) => {
    const hex = id.replace(/-/g, "").slice(0, 8).toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4)}`;
};

/** Whether an event (by end, or start when there is no end) is over. */
export function isPast(start: LocalDateTime | null, end: LocalDateTime | null): boolean {
    const last = toDate(end) ?? toDate(start);
    if (!last) return false;
    if (!end && start) last.setHours(23, 59, 59, 999);
    return last.getTime() < Date.now();
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Initials for an avatar, e.g. "Jane Doe" → "JD". */
export const initials = (name: string | undefined) =>
    (name ?? "?")
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]!.toUpperCase())
        .join("") || "?";
