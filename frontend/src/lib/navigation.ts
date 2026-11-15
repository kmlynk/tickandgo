import {useLocation} from "react-router";

/**
 * Location state used between pages:
 * `from` is the page (path + query) to return to, e.g. a list with its search and page.
 */
export interface NavState {
    from?: string;
}

export function useNavState(): NavState {
    return (useLocation().state as NavState | null) ?? {};
}

/** The current path + query, to pass on as `from`. */
export function useCurrentPath(): string {
    const {pathname, search} = useLocation();
    return pathname + search;
}

/** Reads a zero-based page number from the URL (?page=…); invalid values count as 0. */
export function parsePage(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 0;
}
