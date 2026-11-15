import {useEffect, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router";
import {EmptyState, ErrorBox, Pagination} from "../../components/common";
import EventCard, {EventCardSkeleton} from "../../components/EventCard";
import Icon from "../../components/Icon";
import {listPublishedEvents} from "../../lib/api";
import {useAccount} from "../../lib/auth";
import {errorText} from "../../lib/format";
import {parsePage, useCurrentPath} from "../../lib/navigation";
import type {ListPublishedEventResponse, PageResult} from "../../lib/types";

const PAGE_SIZE = 12;
const SEARCH_DELAY_MS = 350;

/** / : public event discovery with search (?q=…&page=…). */
export default function DiscoverPage() {
    const account = useAccount();
    const currentPath = useCurrentPath();
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get("q") ?? "";
    const page = parsePage(searchParams.get("page"));

    const [input, setInput] = useState(query);
    const [result, setResult] = useState<PageResult<ListPublishedEventResponse>>();
    const [error, setError] = useState<string>();
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const resultsRef = useRef<HTMLElement>(null);

    /** One URL update for both values; defaults are left out. */
    const setUrl = (q: string, p: number, replace = false) => {
        const next = new URLSearchParams();
        if (q.trim()) next.set("q", q.trim());
        if (p > 0) next.set("page", String(p));
        setSearchParams(next, {replace});
    };

    // Keep the box in sync with the URL (back button, "Clear").
    useEffect(() => setInput(query), [query]);

    // Search as you type, after a short pause. Replaces the history entry, so
    // Back doesn't step through every keystroke.
    useEffect(() => {
        if (input.trim() === query.trim()) return;
        const timer = window.setTimeout(() => setUrl(input, 0, true), SEARCH_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [input]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);
        listPublishedEvents(page, query, PAGE_SIZE)
            .then((r) => !cancelled && setResult(r))
            .catch((err) => !cancelled && setError(errorText(err)))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [page, query, reloadKey]);

    const changePage = (p: number) => {
        setUrl(query, p);
        resultsRef.current?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    const searching = query.trim() !== "";

    return (
        <>
            <section className="hero">
                <div className="container hero-inner">
                    <p className="hero-eyebrow">
                        <Icon name="sparkles" size={16}/> Concerts · Parties · Festivals · Talks
                    </p>
                    <h1>Find your next unforgettable night out</h1>
                    <p className="hero-lead">Discover events near you, get tickets in seconds, and walk in with your
                        phone.</p>

                    <form
                        className="searchbar"
                        role="search"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setUrl(input, 0);
                            (document.activeElement as HTMLElement | null)?.blur(); // closes the phone keyboard
                        }}
                    >
                        <Icon name="search" size={20}/>
                        <input
                            type="search"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Search events or venues"
                            aria-label="Search events or venues"
                            enterKeyHint="search"
                        />
                        {input && (
                            <button type="button" className="icon-button" onClick={() => setUrl("", 0)}
                                    aria-label="Clear search">
                                <Icon name="x" size={18}/>
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary searchbar-submit">
                            Search
                        </button>
                    </form>
                </div>
            </section>

            <section className="container section" ref={resultsRef} aria-busy={loading}>
                <div className="section-header">
                    <div>
                        <h2>{searching ? `Results for “${query}”` : "Upcoming events"}</h2>
                        {result && (
                            <p className="muted">
                                {result.totalElements === 0
                                    ? "Nothing found"
                                    : `${result.totalElements} event${result.totalElements === 1 ? "" : "s"}`}
                            </p>
                        )}
                    </div>
                    {searching && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUrl("", 0)}>
                            Clear search
                        </button>
                    )}
                </div>

                {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)}/>}

                {loading && !result && (
                    <div className="event-grid">
                        {Array.from({length: 6}, (_, i) => (
                            <EventCardSkeleton key={i}/>
                        ))}
                    </div>
                )}

                {result && result.content.length === 0 && !error && (
                    <EmptyState
                        icon={searching ? "search" : "calendar"}
                        title={searching ? "No events match your search" : "No upcoming events yet"}
                        action={
                            searching ? (
                                <button type="button" className="btn btn-secondary" onClick={() => setUrl("", 0)}>
                                    Show all events
                                </button>
                            ) : undefined
                        }
                    >
                        {searching ? "Try another name or venue." : "Check back soon — new events are added all the time."}
                    </EmptyState>
                )}

                {result && result.content.length > 0 && (
                    <div className={`event-grid${loading ? " is-loading" : ""}`}>
                        {result.content.map((event) => (
                            <EventCard key={event.id} event={event} from={currentPath}/>
                        ))}
                    </div>
                )}

                {result && (
                    <Pagination page={page} totalPages={result.totalPages} disabled={loading}
                                onPageChange={changePage}/>
                )}
            </section>

            {!account?.isOrganizer && (
                <section className="container section">
                    <div className="promo">
                        <div>
                            <h2>Hosting an event?</h2>
                            <p>
                                Create your event, set up ticket types and start selling in minutes. Your staff checks
                                tickets in with any phone.
                            </p>
                        </div>
                        <Link to="/organizer" className="btn btn-light">
                            Start selling <Icon name="arrowRight" size={18}/>
                        </Link>
                    </div>
                </section>
            )}
        </>
    );
}
