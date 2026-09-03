"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { PageHero, StatCard, StatCardSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  users: { count: number; totalBalance: string };
  transactions: { total: string };
  activations: { count: number; pending: number; completed: number; cancelled: number };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [balance, setBalance] = useState<{ raw: string; balance: number } | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/admin/dashboard").then(setData).catch(() => {});
    apiFetch<{ raw: string; balance: number }>("/api/admin/smsbower/balance").then(setBalance).catch(() => {});
  }, []);

  const act = data?.activations;
  const total = act?.count ?? 0;

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin Console"
        title="Dashboard"
        description="Overview of your SMS panel — users, wallet liabilities, deposits and activations."
        icon={<span>📊</span>}
      >
        <span className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-[11px] font-bold text-slate-300">
          <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
          Live overview
        </span>
      </PageHero>

      {/* ── Key figures ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mt-5">
        {!data && !balance ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total users" value={data?.users?.count ?? "-"} hint="registered accounts" icon="👥" tone="blue" />
            <StatCard
              label="User balances"
              value={data ? `PKR ${Number(data.users.totalBalance).toFixed(2)}` : "-"}
              hint="total wallet liability"
              icon="💰"
              tone="emerald"
            />
            <StatCard
              label="Deposits approved"
              value={data ? `PKR ${Number(data.transactions.total).toFixed(2)}` : "-"}
              hint="all-time"
              icon="📈"
              tone="white"
            />
            <StatCard
              label="SMSBOWER balance"
              value={balance ? `$${balance.balance.toFixed(2)}` : "-"}
              hint="provider wallet"
              icon="🌐"
              tone="amber"
            />
          </>
        )}
      </div>

      {/* ── Activation breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 mt-4 lg:mt-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <h3 className="font-bold text-white">Activation breakdown</h3>
            <span className="text-[11px] text-slate-500 font-semibold">{total} total</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Completed", value: act?.completed ?? 0, cls: "text-emerald-400", bar: "bg-emerald-500" },
              { label: "Pending", value: act?.pending ?? 0, cls: "text-amber-400", bar: "bg-amber-500" },
              { label: "Cancelled", value: act?.cancelled ?? 0, cls: "text-red-400", bar: "bg-red-500/70" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-slate-950/50 border border-white/5 px-3.5 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{s.label}</p>
                <p className={`text-xl lg:text-2xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                <div className="h-1.5 mt-2 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${total > 0 ? Math.max(3, (s.value / total) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">Completion rate: <span className="text-slate-300 font-bold">{total > 0 ? Math.round(((act?.completed ?? 0) / total) * 100) : 0}%</span> of all activations ended with a received code.</p>
        </div>

        <div className="rounded-2xl border border-[#1877F2]/25 bg-gradient-to-br from-[#1877F2]/15 via-slate-900/60 to-slate-900/30 shadow-xl p-5 lg:p-6 relative overflow-hidden">
          <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-[#1877F2]/25 blur-3xl" aria-hidden="true" />
          <p className="relative text-[10px] uppercase tracking-widest text-slate-400 font-bold">Provider wallet</p>
          <p className="relative text-4xl font-bold text-white tabular-nums mt-2">{balance ? `$${balance.balance.toFixed(2)}` : "—"}</p>
          <p className="relative text-xs text-slate-400 mt-2 leading-relaxed">
            Your SMSBOWER credit funds every number a client buys. Keep it topped up to avoid failed orders.
          </p>
          <div className="relative mt-4 rounded-xl bg-slate-950/50 border border-white/5 px-3.5 py-3">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Activations served</p>
            <p className="text-lg font-bold text-white tabular-nums">{total}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
