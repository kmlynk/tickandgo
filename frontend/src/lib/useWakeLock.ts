import {useEffect} from "react";

/** Keeps the phone screen on while the pass is open, like ticket apps do (where supported). */
export function useWakeLock() {
    useEffect(() => {
        let lock: WakeLockSentinel | undefined;
        let released = false;
        const acquire = async () => {
            try {
                if (document.visibilityState === "visible" && "wakeLock" in navigator) {
                    lock = await navigator.wakeLock.request("screen");
                    if (released) await lock.release();
                }
            } catch {
                // Not allowed (e.g. battery saver): the pass still works.
            }
        };
        void acquire();
        // The browser drops the lock when the tab is hidden; take it again on return.
        document.addEventListener("visibilitychange", acquire);
        return () => {
            released = true;
            document.removeEventListener("visibilitychange", acquire);
            void lock?.release().catch(() => {
            });
        };
    }, []);
}
