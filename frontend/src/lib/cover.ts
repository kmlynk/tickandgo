/**
 * The backend has no event images, so every event gets generated cover art:
 * the same event always gets the same colours and pattern.
 */

function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

const PALETTES: [string, string][] = [
    ["#6d28d9", "#db2777"],
    ["#1d4ed8", "#06b6d4"],
    ["#be123c", "#f97316"],
    ["#047857", "#84cc16"],
    ["#7c2d12", "#f59e0b"],
    ["#312e81", "#8b5cf6"],
    ["#0f766e", "#22d3ee"],
    ["#9d174d", "#a855f7"],
    ["#1e3a8a", "#ec4899"],
    ["#14532d", "#14b8a6"],
];

export interface Cover {
    from: string;
    to: string;
    angle: number;
    pattern: number;
    /** Positions for decorative shapes, in percent. */
    shapes: { x: number; y: number; r: number }[];
}

export function coverFor(key: string): Cover {
    const h = hash(key || "event");
    const [from, to] = PALETTES[h % PALETTES.length]!;
    const shapes = Array.from({length: 3}, (_, i) => {
        const v = hash(`${key}:${i}`);
        return {x: v % 100, y: (v >>> 8) % 100, r: 18 + ((v >>> 16) % 30)};
    });
    return {from, to, angle: 110 + (h % 140), pattern: (h >>> 4) % 3, shapes};
}
