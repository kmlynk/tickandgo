import type {ReactNode} from "react";
import {Link} from "react-router";
import {dateBadge} from "../lib/format";
import type {LocalDateTime} from "../lib/types";
import Icon, {type IconName} from "./Icon";

/** Calendar-style date block: "DEC / 14". */
export function DateBadge({value, className = ""}: { value: LocalDateTime | null; className?: string }) {
    const d = dateBadge(value);
    return (
        <div className={`date-badge ${className}`} aria-hidden={!d}>
            {d ? (
                <>
                    <span className="date-badge-month">{d.month}</span>
                    <span className="date-badge-day">{d.day}</span>
                </>
            ) : (
                <span className="date-badge-month">TBA</span>
            )}
        </div>
    );
}

export function EmptyState({
                               icon,
                               title,
                               children,
                               action,
                           }: {
    icon: IconName;
    title: string;
    children?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Icon name={icon} size={28}/>
            </div>
            <h3>{title}</h3>
            {children && <p>{children}</p>}
            {action}
        </div>
    );
}

export function ErrorBox({message, onRetry}: { message: string; onRetry?: () => void }) {
    return (
        <div className="alert alert-error" role="alert">
            <Icon name="alert" size={18}/>
            <div>
                <p>{message}</p>
                {onRetry && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
}

/** Page title row with an optional back link and actions. */
export function PageHeader({
                               title,
                               subtitle,
                               back,
                               actions,
                           }: {
    title: string;
    subtitle?: ReactNode;
    back?: { to: string; label: string };
    actions?: ReactNode;
}) {
    return (
        <header className="page-header">
            {back && (
                <Link to={back.to} className="back-link">
                    <Icon name="arrowLeft" size={18}/>
                    {back.label}
                </Link>
            )}
            <div className="page-header-row">
                <div>
                    <h1>{title}</h1>
                    {subtitle && <p className="page-subtitle">{subtitle}</p>}
                </div>
                {actions && <div className="page-actions">{actions}</div>}
            </div>
        </header>
    );
}

export function Pagination({
                               page,
                               totalPages,
                               disabled,
                               onPageChange,
                           }: {
    page: number;
    totalPages: number;
    disabled?: boolean;
    onPageChange: (page: number) => void;
}) {
    if (totalPages <= 1) return null;
    return (
        <nav className="pagination" aria-label="Pages">
            <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabled || page === 0}
                onClick={() => onPageChange(page - 1)}
            >
                <Icon name="chevronLeft" size={16}/> Previous
            </button>
            <span className="pagination-info">
        Page {page + 1} of {totalPages}
      </span>
            <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabled || page >= totalPages - 1}
                onClick={() => onPageChange(page + 1)}
            >
                Next <Icon name="chevronRight" size={16}/>
            </button>
        </nav>
    );
}

export function Spinner({label = "Loading"}: { label?: string }) {
    return <span className="spinner" role="status" aria-label={label}/>;
}

export function Chip({tone = "neutral", children}: { tone?: string; children: ReactNode }) {
    return <span className={`chip chip-${tone}`}>{children}</span>;
}
