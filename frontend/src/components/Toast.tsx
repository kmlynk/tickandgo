import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from "react";
import Icon from "./Icon";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
    id: number;
    kind: ToastKind;
    message: string;
}

type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {
});

/** Shows short messages ("Event saved") that survive page navigation. */
export function ToastProvider({children}: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

    const show = useCallback<ShowToast>(
        (message, kind = "success") => {
            const id = Date.now() + Math.random();
            setToasts((list) => [...list.slice(-2), {id, kind, message}]);
            window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
        },
        [dismiss],
    );

    const value = useMemo(() => show, [show]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="toasts" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.kind}`}>
                        <Icon name={t.kind === "error" ? "alert" : t.kind === "info" ? "info" : "check"} size={18}/>
                        <span>{t.message}</span>
                        <button type="button" className="toast-close" onClick={() => dismiss(t.id)}
                                aria-label="Dismiss">
                            <Icon name="x" size={16}/>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
