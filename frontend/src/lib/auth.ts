import {WebStorageStateStore, type User} from "oidc-client-ts";
import {useAuth, type AuthProviderProps} from "react-oidc-context";
import {useNavigate} from "react-router";

const KEYCLOAK = "http://localhost:9090";
const REALM_PATH = "/realms/event-ticket-platform";
const OIDC_PATH = `${REALM_PATH}/protocol/openid-connect`;
const CALLBACK_URL = window.location.origin + "/callback";

// Metadata is given explicitly (no discovery) so the token request goes through
// the Vite proxy at /keycloak, while the login page itself stays on Keycloak.
export const oidcConfig: AuthProviderProps = {
    authority: KEYCLOAK + REALM_PATH,
    client_id: "event-ticket-platform-app",
    // Must match the client's "Valid redirect URIs" in Keycloak.
    redirect_uri: CALLBACK_URL,
    // No post_logout_redirect_uri: the client has no "Valid post logout redirect
    // URIs", and Keycloak rejects logout when an unlisted one is sent.
    scope: "openid profile email",
    metadata: {
        issuer: KEYCLOAK + REALM_PATH,
        authorization_endpoint: `${KEYCLOAK}${OIDC_PATH}/auth`,
        token_endpoint: `/keycloak${OIDC_PATH}/token`,
        userinfo_endpoint: `/keycloak${OIDC_PATH}/userinfo`,
        end_session_endpoint: `${KEYCLOAK}${OIDC_PATH}/logout`,
        jwks_uri: `/keycloak${OIDC_PATH}/certs`,
    },
    // Keep the login across page reloads.
    userStore: new WebStorageStateStore({store: window.localStorage}),
    // onSigninCallback is set in main.tsx, where the router is available.
};

/** State carried through the Keycloak round trip, to return to the right page. */
interface LoginState {
    returnTo: string;
}

/** Starts a Keycloak login that comes back to `returnTo` (default: the current page). */
export function useLogin() {
    const auth = useAuth();
    return (returnTo = window.location.pathname + window.location.search) =>
        auth.signinRedirect({state: {returnTo} satisfies LoginState});
}

export function returnPathFrom(user: User | void): string {
    const state = user?.state as Partial<LoginState> | undefined;
    // Only allow paths inside this app.
    return state?.returnTo?.startsWith("/") && !state.returnTo.startsWith("//")
        ? state.returnTo
        : "/";
}

/** Access token of the logged-in user; only use below <RequireLogin>. */
export function useAccessToken(): string {
    const auth = useAuth();
    if (!auth.user) throw new Error("useAccessToken used outside <RequireLogin>");
    return auth.user.access_token;
}


/**
 * Keycloak realm role needed for the organizer pages. The backend reads
 * `realm_access.roles` from the access token and checks hasRole("ORGANIZER").
 */
export const ORGANIZER_ROLE = "ROLE_ORGANIZER";

/** Realm roles from the access token (not the ID token: Keycloak puts them there). */
export function realmRolesOf(user: User | null | undefined): string[] {
    const payload = user?.access_token.split(".")[1];
    if (!payload) return [];
    try {
        const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
        const roles = JSON.parse(json)?.realm_access?.roles;
        return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string") : [];
    } catch {
        return [];
    }
}

/** Keycloak realm role needed to validate tickets at the entrance (hasRole("STAFF")). */
export const STAFF_ROLE = "ROLE_STAFF";

/** Whether the logged-in user has the given realm role. */
export function useHasRole(role: string): boolean {
    const auth = useAuth();
    return auth.isAuthenticated && realmRolesOf(auth.user).includes(role);
}

/** Whether the logged-in user may create, edit and delete events. */
export const useIsOrganizer = () => useHasRole(ORGANIZER_ROLE);

/** Whether the logged-in user may scan and validate tickets. */
export const useIsStaff = () => useHasRole(STAFF_ROLE);

/**
 * Logs out: leaves protected pages first (so they don't start a new login), forgets
 * the login in this app, then ends the Keycloak session. There is no
 * post_logout_redirect_uri (not configured in Keycloak), so the user ends on
 * Keycloak's "You are logged out" page.
 */
export function useLogout() {
    const auth = useAuth();
    const navigate = useNavigate();
    return async () => {
        const idToken = auth.user?.id_token;
        await navigate("/");
        await auth.removeUser();
        await auth.signoutRedirect({id_token_hint: idToken});
    };
}

export interface Account {
    username: string;
    displayName: string;
    email?: string;
    isOrganizer: boolean;
    isStaff: boolean;
}

/** The logged-in user's profile and roles, or undefined when logged out. */
export function useAccount(): Account | undefined {
    const auth = useAuth();
    if (!auth.isAuthenticated || !auth.user) return undefined;
    const p = auth.user.profile;
    const roles = realmRolesOf(auth.user);
    const username = p.preferred_username ?? p.sub;
    return {
        username,
        displayName: p.name ?? ([p.given_name, p.family_name].filter(Boolean).join(" ") || username),
        email: p.email,
        isOrganizer: roles.includes(ORGANIZER_ROLE),
        isStaff: roles.includes(STAFF_ROLE),
    };
}
