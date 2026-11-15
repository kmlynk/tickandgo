import {useAuth} from "react-oidc-context";
import {Link, NavLink, Outlet, ScrollRestoration, useLocation} from "react-router";
import {useAccount, useLogin} from "../lib/auth";
import {initials} from "../lib/format";
import Icon, {type IconName} from "./Icon";

interface NavItem {
    to: string;
    label: string;
    icon: IconName;
    /** Custom "active" test; default is the router's prefix match. */
    active?: (path: string) => boolean;
}

export function Logo() {
    return (
        <Link to="/" className="logo" aria-label="Tick&Go home">
      <span className="logo-mark" aria-hidden="true">
        <Icon name="ticket" size={18}/>
      </span>
            <span className="logo-text">
        Tick<span>&amp;</span>Go
      </span>
        </Link>
    );
}

/** Main layout: top bar, page content, and on phones a bottom tab bar. */
export default function AppLayout() {
    const auth = useAuth();
    const login = useLogin();
    const account = useAccount();
    const {pathname} = useLocation();

    // Navigation adapts to the user's roles.
    const items: NavItem[] = [
        {to: "/", label: "Discover", icon: "compass", active: (p) => p === "/" || p.startsWith("/events/")},
        {to: "/tickets", label: "My tickets", icon: "ticket"},
    ];
    if (account?.isOrganizer) items.push({to: "/organizer", label: "Manage", icon: "grid"});
    if (account?.isStaff) items.push({to: "/staff", label: "Check-in", icon: "scan"});
    const tabs: NavItem[] = [...items, {to: "/account", label: "Account", icon: "user"}];

    const isActive = (item: NavItem) =>
        item.active ? item.active(pathname) : pathname === item.to || pathname.startsWith(`${item.to}/`);

    return (
        <div className="app">
            <a href="#main" className="skip-link">
                Skip to content
            </a>

            <header className="topbar">
                <div className="topbar-inner container">
                    <Logo/>
                    <nav className="topnav" aria-label="Main">
                        {items.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={() => `topnav-link${isActive(item) ? " active" : ""}`}
                            >
                                <Icon name={item.icon} size={18}/>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="topbar-actions">
                        {account ? (
                            <Link to="/account" className="avatar-link" aria-label="Your account">
                                <span className="avatar">{initials(account.displayName)}</span>
                                <span className="avatar-name">{account.displayName}</span>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => login()}
                                disabled={auth.isLoading}
                            >
                                Log in
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main id="main" className="main">
                {auth.error && (
                    <div className="container">
                        <div className="alert alert-error" role="alert">
                            <Icon name="alert" size={18}/>
                            <div>
                                <p>
                                    <strong>Login failed:</strong> {auth.error.message}
                                </p>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => login()}>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <Outlet/>
            </main>

            <footer className="footer">
                <div className="container footer-inner">
                    <Logo/>
                    <p>Discover events, buy tickets, get in with your phone.</p>
                    <p className="footer-small">© {new Date().getFullYear()} Tick&amp;Go · Prices in EUR</p>
                </div>
            </footer>

            <nav className="tabbar" aria-label="Main">
                {tabs.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={() => `tabbar-link${isActive(item) ? " active" : ""}`}
                    >
                        <Icon name={item.icon} size={22}/>
                        <span>{item.label === "My tickets" ? "Tickets" : item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <ScrollRestoration/>
        </div>
    );
}
