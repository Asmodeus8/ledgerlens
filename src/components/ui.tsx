import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Logo({ className = "", compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6">
        <rect width="24" height="24" rx="6" className="fill-accent" />
        <path
          d="M7.5 5.5h9v12.2l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1z"
          className="fill-accent-foreground"
          opacity="0.95"
        />
        <path
          d="M9.5 9h5M9.5 11.5h5M9.5 14h3"
          className="stroke-accent"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <span className={compact ? "hidden sm:inline" : undefined}>Ledgerlens</span>
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent-soft-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mb-5 font-medium">{title}</p>
      {action}
    </div>
  );
}
