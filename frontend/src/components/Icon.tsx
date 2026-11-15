import type {SVGProps} from "react";

/** 24×24 stroke icons (Lucide-style outlines, drawn inline so no icon package is needed). */
const PATHS = {
    search: <>
        <circle cx="11" cy="11" r="7"/>
        <path d="m20 20-3.5-3.5"/>
    </>,
    compass: <>
        <circle cx="12" cy="12" r="9"/>
        <path d="m15.5 8.5-2 5-5 2 2-5z"/>
    </>,
    ticket: <>
        <path
            d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/>
        <path d="M14 6v2M14 11v2M14 16v2"/>
    </>,
    calendar: <>
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M3 10h18M8 3v4M16 3v4"/>
    </>,
    calendarPlus: <>
        <rect x="3" y="5" width="18" height="16" rx="2"/>
        <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>
    </>,
    clock: <>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 2"/>
    </>,
    pin: <>
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/>
        <circle cx="12" cy="9.5" r="2.5"/>
    </>,
    user: <>
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 21a8 8 0 0 1 16 0"/>
    </>,
    grid: <>
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </>,
    scan: <>
        <path
            d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>
    </>,
    qr: <>
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>
    </>,
    plus: <path d="M12 5v14M5 12h14"/>,
    minus: <path d="M5 12h14"/>,
    x: <path d="M6 6l12 12M18 6 6 18"/>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
    chevronRight: <path d="m9 6 6 6-6 6"/>,
    chevronLeft: <path d="m15 6-6 6 6 6"/>,
    arrowLeft: <path d="M19 12H5m6-6-6 6 6 6"/>,
    arrowRight: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    share: <>
        <circle cx="18" cy="5" r="2.5"/>
        <circle cx="6" cy="12" r="2.5"/>
        <circle cx="18" cy="19" r="2.5"/>
        <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>
    </>,
    edit: <>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>
        <path d="m13.5 6.5 4 4"/>
    </>,
    trash: <>
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>
    </>,
    eye: <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/>
        <circle cx="12" cy="12" r="3"/>
    </>,
    logout: <>
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11"/>
    </>,
    login: <>
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/>
    </>,
    sun: <>
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
    </>,
    moon: <path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>,
    monitor: <>
        <rect x="3" y="4" width="18" height="12" rx="2"/>
        <path d="M8 20h8M12 16v4"/>
    </>,
    sparkles: <>
        <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>
        <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>
    </>,
    flashlight: <>
        <path d="M8 2h8v4l-2 3v13h-4V9L8 6z"/>
        <path d="M12 13v2"/>
    </>,
    camera: <>
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
        <circle cx="12" cy="13.5" r="3.5"/>
    </>,
    switchCamera: <>
        <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
        <path d="M9 13a3 3 0 0 1 5.2-2M15 13a3 3 0 0 1-5.2 2M14.5 9.5v1.7h-1.7M9.5 16.5v-1.7h1.7"/>
    </>,
    keyboard: <>
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>
    </>,
    image: <>
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <circle cx="9" cy="10" r="2"/>
        <path d="m21 16-5-5-9 9"/>
    </>,
    history: <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
        <path d="M3 3v5h5M12 7v5l3 2"/>
    </>,
    shield: <>
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>
        <path d="m9 12 2 2 4-4"/>
    </>,
    users: <>
        <circle cx="9" cy="8" r="3.5"/>
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>
    </>,
    euro: <>
        <path d="M17 6.5A6.5 6.5 0 1 0 17 17.5"/>
        <path d="M4 10h9M4 14h9"/>
    </>,
    chart: <>
        <path d="M4 20V4M4 20h16"/>
        <path d="M8 16v-4M12 16V8M16 16v-6"/>
    </>,
    more: <>
        <circle cx="5" cy="12" r="1.3"/>
        <circle cx="12" cy="12" r="1.3"/>
        <circle cx="19" cy="12" r="1.3"/>
    </>,
    info: <>
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 11v5M12 8h.01"/>
    </>,
    alert: <>
        <path d="M12 3 2 20h20z"/>
        <path d="M12 10v4M12 17h.01"/>
    </>,
    copy: <>
        <rect x="8" y="8" width="13" height="13" rx="2"/>
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>
    </>,
    external: <>
        <path d="M14 4h6v6M20 4l-9 9"/>
        <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>
    </>,
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, "name"> {
    name: IconName;
    size?: number;
    /** Accessible label; without it the icon is decorative. */
    label?: string;
}

export default function Icon({name, size = 20, label, ...rest}: Props) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden={label ? undefined : true}
            aria-label={label}
            role={label ? "img" : undefined}
            className="icon"
            {...rest}
        >
            {PATHS[name]}
        </svg>
    );
}
