export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
