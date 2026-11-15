import type {ReactNode} from "react";
import {coverFor} from "../lib/cover";

interface Props {
    /** Stable key (the event id) so the art never changes. */
    seed: string;
    /** Large title text rendered on the art, e.g. for the event page. */
    children?: ReactNode;
    className?: string;
}

/** Generated cover art: a gradient plus soft shapes, unique per event. */
export default function EventCover({seed, children, className = ""}: Props) {
    const c = coverFor(seed);
    return (
        <div
            className={`cover ${className}`}
            style={{background: `linear-gradient(${c.angle}deg, ${c.from}, ${c.to})`}}
        >
            <svg className="cover-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                {c.pattern === 0 &&
                    c.shapes.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff"
                                                   opacity={0.1 + i * 0.04}/>)}
                {c.pattern === 1 &&
                    c.shapes.map((s, i) => (
                        <rect
                            key={i}
                            x={s.x - s.r / 2}
                            y={s.y - s.r / 2}
                            width={s.r}
                            height={s.r}
                            rx={4}
                            fill="#fff"
                            opacity={0.1 + i * 0.04}
                            transform={`rotate(${s.r * 3} ${s.x} ${s.y})`}
                        />
                    ))}
                {c.pattern === 2 &&
                    c.shapes.map((s, i) => (
                        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="none" stroke="#fff" strokeWidth={3}
                                opacity={0.18}/>
                    ))}
            </svg>
            {children && <div className="cover-content">{children}</div>}
        </div>
    );
}
