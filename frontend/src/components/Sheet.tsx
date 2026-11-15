import {useEffect, useId, type ReactNode} from "react";
import {createPortal} from "react-dom";
import Icon from "./Icon";

interface Props {
    title: string;
    onClose: () => void;
    children: ReactNode;
    /** Sticky footer, e.g. the confirm button. */
    footer?: ReactNode;
}

/** Bottom sheet on phones, centred dialog on larger screens. Closes on Escape and backdrop tap. */
export default function Sheet({title, onClose, children, footer}: Props) {
    const titleId = useId();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        // Stop the page behind from scrolling.
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
        };
    }, [onClose]);

    return createPortal(
        <div className="sheet-backdrop" onClick={onClose}>
            <div
                className="sheet"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet-handle" aria-hidden="true"/>
                <header className="sheet-header">
                    <h2 id={titleId}>{title}</h2>
                    <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
                        <Icon name="x"/>
                    </button>
                </header>
                <div className="sheet-body">{children}</div>
                {footer && <footer className="sheet-footer">{footer}</footer>}
            </div>
        </div>,
        document.body,
    );
}
