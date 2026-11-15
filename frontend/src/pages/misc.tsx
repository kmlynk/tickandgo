import {useAuth} from "react-oidc-context";
import {Link, Navigate, useParams, useSearchParams} from "react-router";
import {EmptyState, Spinner} from "../components/common";

/** Keycloak redirects here after login; main.tsx navigates on once the login is processed. */
export function CallbackPage() {
    const auth = useAuth();
    const [searchParams] = useSearchParams();
    // Opened without a login code (e.g. a bookmark): nothing to process.
    if (!searchParams.has("code") && !searchParams.has("error")) return <Navigate to="/" replace/>;
    // A failed login is shown by the layout.
    if (auth.error) return null;
    return (
        <div className="center-screen">
            <Spinner/>
            <p>Signing you in…</p>
        </div>
    );
}

export function NotFoundPage() {
    return (
        <div className="container narrow section">
            <EmptyState
                icon="compass"
                title="Page not found"
                action={
                    <Link to="/" className="btn btn-primary">
                        Discover events
                    </Link>
                }
            >
                There's nothing at this address.
            </EmptyState>
        </div>
    );
}

/** Old organizer URLs (/dashboard/events/...) keep working. */
export function LegacyEditRedirect() {
    const {eventId} = useParams();
    return <Navigate to={`/organizer/events/${eventId}/edit`} replace/>;
}
