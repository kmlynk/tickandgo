import {useEffect, useState} from "react";

export type ThemePreference = "system" | "light" | "dark";
const KEY = "tickandgo.theme";

function read(): ThemePreference {
    try {
        const value = localStorage.getItem(KEY);
        return value === "light" || value === "dark" ? value : "system";
    } catch {
        return "system";
    }
}

function apply(pref: ThemePreference) {
    const root = document.documentElement;
    if (pref === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", pref);
}

/** Call once at startup, before the first render, to avoid a flash of the wrong theme. */
export const initTheme = () => apply(read());

export function useTheme() {
    const [pref, setPref] = useState<ThemePreference>(read);
    useEffect(() => {
        apply(pref);
        try {
            if (pref === "system") localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, pref);
        } catch {
            // Storage blocked: the choice lasts for this visit only.
        }
    }, [pref]);
    return [pref, setPref] as const;
}
