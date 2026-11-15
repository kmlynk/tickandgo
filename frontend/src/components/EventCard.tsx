import {Link} from "react-router";
import {formatWhen, relativeTime} from "../lib/format";
import type {NavState} from "../lib/navigation";
import type {ListPublishedEventResponse} from "../lib/types";
import {DateBadge} from "./common";
import EventCover from "./EventCover";
import Icon from "./Icon";

/** Public event card used on the discover page. */
export default function EventCard({event, from}: { event: ListPublishedEventResponse; from: string }) {
    const soon = relativeTime(event.start);
    return (
        <Link to={`/events/${event.id}`} state={{from} satisfies NavState} className="event-card">
            <EventCover seed={event.id} className="event-card-cover">
                <DateBadge value={event.start}/>
            </EventCover>
            <div className="event-card-body">
                <h3>{event.name}</h3>
                <p className="meta">
                    <Icon name="calendar" size={16}/>
                    {formatWhen(event.start, null)}
                </p>
                <p className="meta">
                    <Icon name="pin" size={16}/>
                    <span className="truncate">{event.venue}</span>
                </p>
                {soon && event.start && new Date(event.start).getTime() > Date.now() && (
                    <span className="event-card-soon">{soon}</span>
                )}
            </div>
        </Link>
    );
}

export function EventCardSkeleton() {
    return (
        <div className="event-card skeleton-card" aria-hidden="true">
            <div className="event-card-cover skeleton"/>
            <div className="event-card-body">
                <div className="skeleton skeleton-line" style={{width: "80%"}}/>
                <div className="skeleton skeleton-line" style={{width: "55%"}}/>
                <div className="skeleton skeleton-line" style={{width: "65%"}}/>
            </div>
        </div>
    );
}
