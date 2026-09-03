import type { ReactNode } from "react";

/**
 * Table shell used by every data page. Optional header row with title /
 * actions keeps tables and card grids visually consistent.
 */
export function TableCard({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/5 bg-slate-950/40">
          {typeof title === "string" ? <h3 className="font-bold text-white text-sm">{title}</h3> : title}
          {actions}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
