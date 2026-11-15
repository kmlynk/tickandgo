import {useEffect, useRef} from "react";
import {useAuth} from "react-oidc-context";
import {Link, Outlet} from "react-router";
import {useHasRole, useLogin} from "../lib/auth";
import {Spinner} from "./common";
import Icon from "./Icon";

/** Renders the nested routes only when logged in; otherwise starts a login that comes back here. */
export function RequireLogin() {
    const auth = useAuth();
    const login = useLogin();
    const started = useRef(false);

    const mustLogin = !auth.isLoading && !auth.isAuthenticated && !auth.error;

    useEffect(() => {
        // The ref stops StrictMode's double effect from starting two logins.
        if (mustLogin && !started.current) {
            started.current = true;
            login();
        }
    }, [mustLogin, login]);

    if (auth.isAuthenticated && auth.user) return <Outlet/>;
    // A failed login is shown by the layout; don't loop back to Keycloak.
    if (auth.error) return null;
    return (
        <div className="center-screen">
            <Spinner/>
            <p>{auth.isLoading ? "Loading…" : "Taking you to the login…"}</p>
        </div>
    );
}

interface RoleProps {
    /** Keycloak realm role, e.g. "ROLE_ORGANIZER". */
    role: string;
    /** Who the area is for, e.g. "Organizers". */
    audience: string;
    /** What needs the role, e.g. "Creating and managing events". */
    purpose: string;
}

/** Renders the nested routes only for users with the role. Use below <RequireLogin>. */
export function RequireRole({role, audience, purpose}: RoleProps) {
    const auth = useAuth();
    if (useHasRole(role)) return <Outlet/>;
    return (
        <div className="container narrow">
            <div className="empty card">
                <div className="empty-icon">
                    <Icon name="shield" size={28}/>
                </div>
                <h3>{audience} only</h3>
                <p>
                    {purpose} needs the <code>{role}</code> role. You're signed in as{" "}
                    <strong>{auth.user?.profile.preferred_username}</strong>, which doesn't have it. Ask an
                    administrator to add the role in Keycloak, then log in again.
                </p>
                <Link to="/" className="btn btn-primary">
                    Discover events
                </Link>
            </div>
        </div>
    );
}
