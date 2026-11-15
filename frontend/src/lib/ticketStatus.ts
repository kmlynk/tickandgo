import type {EventStatus, TicketStatus} from "./types";

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
    PURCHASED: "Valid",
    USED: "Used",
    CANCELLED: "Cancelled",
};

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    CANCELED: "Cancelled",
    COMPLETED: "Completed",
};
