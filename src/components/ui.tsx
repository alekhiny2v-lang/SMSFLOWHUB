import type { ReactNode } from "react";

/**
 * Shared UI primitives that carry the visual language of the Buy page —
 * gradient hero headers, stat tiles, status pills, empty states and
 * skeletons — so every page of the panel feels like one product.
 */

/* ── Page hero header ─────────────────────────────────────────────── */

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/15 via-surface/60 to-surface/30 p-5 lg:p-6">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {icon && (
            <div className="shrink-0 grid place-items-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-xl brand-glow">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft">{eyebrow}</p>
            )}
            <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">{title}</h1>
            {description && <p className="text-muted text-sm mt-1 max-w-2xl">{description}</p>}
          </div>
        </div>
        {children && <div className="flex items-center gap-2 shrink-0 flex-wrap">{children}</div>}
      </div>
    </section>
  );
}

/* ── Stat tile ────────────────────────────────────────────────────── */

/**
 * Stat tones. `brand` is the amber accent used for highlights; `info` (blue)
 * carries "pending / waiting" states so they never read as a call to action.
 */
const TONES = {
  white: "text-white",
  brand: "text-brand",
  emerald: "text-emerald-400",
  info: "text-info",
  red: "text-red-400",
} as const;

export type StatTone = keyof typeof TONES;

const ICON_TILES: Record<StatTone, string> = {
  white: "bg-white/5 border-white/10",
  brand: "bg-brand/15 border-brand/30",
  emerald: "bg-emerald-500/10 border-emerald-500/25",
  info: "bg-info/10 border-info/25",
  red: "bg-red-500/10 border-red-500/25",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "white",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 card-hover relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted font-bold">{label}</p>
          <p className={`text-2xl lg:text-[28px] font-bold tabular-nums mt-1.5 leading-tight ${TONES[tone]}`}>{value}</p>
          {hint && <p className="text-[11px] text-muted mt-1 truncate">{hint}</p>}
        </div>
        {icon && (
          <span className={`grid place-items-center w-10 h-10 rounded-xl border shrink-0 text-base ${ICON_TILES[tone]}`}>{icon}</span>
        )}
      </div>
    </div>
  );
}

/* ── Status pill ──────────────────────────────────────────────────── */

const STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  pending: { label: "Pending", className: "bg-info/10 text-info border-info/25" },
  cancelled: { label: "Cancelled", className: "bg-red-500/10 text-red-400 border-red-500/25" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/25" },
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" },
  inactive: { label: "Inactive", className: "bg-red-500/10 text-red-400 border-red-500/25" },
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const meta = STATUS_META[status] ?? { label: status, className: "bg-white/10 text-muted border-white/10" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap border ${meta.className}`}>
      {(status === "completed" || status === "active") && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {status === "pending" && (
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-current live-ping" />
      )}
      {label ?? meta.label}
    </span>
  );
}

/* ── Empty state ──────────────────────────────────────────────────── */

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-surface/60 p-8 text-center">
      <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-2xl">{icon}</div>
      <p className="font-bold text-white">{title}</p>
      {description && <p className="text-sm text-muted mt-1 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Skeletons ────────────────────────────────────────────────────── */

export function StatCardSkeleton() {
  return (
    <div className="bg-surface/70 border border-white/5 rounded-2xl p-5">
      <div className="skeleton h-3 w-24 rounded mb-3" />
      <div className="skeleton h-8 w-20 rounded" />
      <div className="skeleton h-2.5 w-28 rounded mt-2.5" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-surface/70 border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex gap-4 px-5 py-3.5 bg-canvas/50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton h-2.5 w-20 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-4 border-t border-white/5">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3.5 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Section heading (above tables / card grids) ──────────────────── */

export function SectionHeading({ icon, title, badge, children }: { icon?: ReactNode; title: string; badge?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
        {icon && <span className="grid place-items-center w-8 h-8 rounded-xl bg-brand/15 border border-brand/30 text-base">{icon}</span>}
        {title}
        {badge}
      </h2>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

/* ── Info row (profile style label/value) ─────────────────────────── */

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <p className="text-xs uppercase tracking-wider font-bold text-muted">{label}</p>
      <p className="text-sm font-semibold text-white text-right">{value}</p>
    </div>
  );
}
