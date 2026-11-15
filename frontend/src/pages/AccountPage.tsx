import {Link} from "react-router";
import {Chip} from "../components/common";
import Icon, {type IconName} from "../components/Icon";
import {useAccount, useLogin, useLogout} from "../lib/auth";
import {initials} from "../lib/format";
import {useTheme, type ThemePreference} from "../lib/theme";

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
    {value: "system", label: "Auto", icon: "monitor"},
    {value: "light", label: "Light", icon: "sun"},
    {value: "dark", label: "Dark", icon: "moon"},
];

function ThemePicker() {
    const [theme, setTheme] = useTheme();
    return (
        <section className="card">
            <h2 className="card-title">Appearance</h2>
            <div className="segmented segmented-full" role="radiogroup" aria-label="Theme">
                {THEMES.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={theme === t.value}
                        className={theme === t.value ? "active" : ""}
                        onClick={() => setTheme(t.value)}
                    >
                        <Icon name={t.icon} size={16}/> {t.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

function MenuLink({to, icon, title, text}: { to: string; icon: IconName; title: string; text: string }) {
    return (
        <Link to={to} className="menu-link">
      <span className="menu-link-icon">
        <Icon name={icon} size={20}/>
      </span>
            <span className="menu-link-text">
        <strong>{title}</strong>
        <span>{text}</span>
      </span>
            <Icon name="chevronRight" size={18}/>
        </Link>
    );
}

/** /account : profile, roles, shortcuts per role, theme and logout. Works logged out too. */
export default function AccountPage() {
    const account = useAccount();
    const login = useLogin();
    const logout = useLogout();

    if (!account) {
        return (
            <div className="container narrow section">
                <section className="card welcome">
                    <div className="welcome-icon">
                        <Icon name="ticket" size={32}/>
                    </div>
                    <h1>Welcome to Tick&amp;Go</h1>
                    <p className="muted">Log in to buy tickets, keep them on your phone and get in with one scan.</p>
                    <button type="button" className="btn btn-primary btn-lg btn-block"
                            onClick={() => login("/account")}>
                        <Icon name="login" size={18}/> Log in
                    </button>
                </section>
                <ThemePicker/>
            </div>
        );
    }

    return (
        <div className="container narrow section">
            <section className="card profile">
                <span className="avatar avatar-lg">{initials(account.displayName)}</span>
                <div className="profile-text">
                    <h1>{account.displayName}</h1>
                    <p className="muted">{account.email ?? `@${account.username}`}</p>
                    <div className="chip-row">
                        <Chip tone="brand">Attendee</Chip>
                        {account.isOrganizer && <Chip tone="success">Organizer</Chip>}
                        {account.isStaff && <Chip tone="info">Staff</Chip>}
                    </div>
                </div>
            </section>

            <section className="card menu">
                <MenuLink to="/tickets" icon="ticket" title="My tickets" text="Your passes and QR codes"/>
                <MenuLink to="/" icon="compass" title="Discover events" text="Find something to do"/>
                {account.isOrganizer && (
                    <MenuLink to="/organizer" icon="grid" title="Manage events" text="Create events and ticket types"/>
                )}
                {account.isStaff &&
                    <MenuLink to="/staff" icon="scan" title="Check-in" text="Scan tickets at the entrance"/>}
            </section>

            <ThemePicker/>

            <button type="button" className="btn btn-secondary btn-block btn-lg" onClick={logout}>
                <Icon name="logout" size={18}/> Log out
            </button>
        </div>
    );
}
