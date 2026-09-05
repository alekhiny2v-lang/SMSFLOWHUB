"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatCard, StatCardSkeleton, StatusPill, TableSkeleton } from "@/components/ui";
import { FacebookLogo } from "@/components/FacebookLogo";
import { SMSFlowLogo } from "@/components/SMSFlowLogo";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Activation {
  id: number;
  countryName: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

export default function ClientDashboard() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<{ username: string; balance: string } | null>(null);

  useEffect(() => {
    apiFetch<Activation[]>("/api/client/activations")
      .then(setActivations)
      .catch(() => {})
      .finally(() => setLoaded(true));
    apiFetch<{ username: string; balance: string }>("/api/auth/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  const pending = activations.filter((a) => a.status === "pending").length;
  const completed = activations.filter((a) => a.status === "completed").length;

  return (
    <ClientLayout>
      {/* ── Hero ── */}
      <PageHero
        eyebrow="Client Portal"
        title={me ? `Welcome back, ${me.username}` : "Dashboard"}
        description="Your wallet, numbers and OTP activity at a glance."
        icon={<SMSFlowLogo size={48} className="rounded-2xl" />}
      >
        <Link href="/client/buy" className="btn-primary btn-shine">
          <FacebookLogo size={14} variant="glyph" accessible={false} />
          Buy a number
        </Link>
        <Link href="/client/deposits" className="btn-ghost">
          + Add funds
        </Link>
      </PageHero>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        {me === null && !loaded ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Wallet balance" value={me ? `PKR ${Number(me.balance).toFixed(2)}` : "—"} hint="available to spend" icon="💰" tone="emerald" />
            <StatCard label="My numbers" value={activations.length} hint="all-time purchases" icon="📱" tone="brand" />
            <StatCard label="Awaiting SMS" value={pending} hint="auto-checking every 5s" icon="⏳" tone="info" />
            <StatCard label="Codes received" value={completed} hint="ready to paste" icon="✅" tone="white" />
          </>
        )}
      </div>

      {/* ── Recent activity ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🕘</span>
          Recent Numbers
        </h2>
        <Link href="/client/history" className="text-xs font-bold text-brand-soft hover:text-white transition">
          View full history →
        </Link>
      </div>

      {!loaded ? (
        <TableSkeleton rows={5} cols={4} />
      ) : activations.length === 0 ? (
        <EmptyState
          icon={<span className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-brand/25 brand-badge-bloom"><SMSFlowLogo size={40} /></span>}
          title="No numbers yet"
          description="Buy your first Facebook number and the OTP will show up here in real time."
          action={
            <Link href="/client/buy" className="btn-primary btn-shine">
              <FacebookLogo size={14} variant="glyph" accessible={false} />
              Buy your first number
            </Link>
          }
        />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr>
                <th className="th">Country</th>
                <th className="th">Phone</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {activations.slice(0, 10).map((a) => (
                <tr key={a.id} className="tr-hover">
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{getCountryFlagByName(a.countryName)}</span>
                      <span className="font-semibold text-white">{a.countryName || "-"}</span>
                    </span>
                  </td>
                  <td className="td font-mono">{a.phoneNumber || "-"}</td>
                  <td className="td">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="td text-muted">{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </ClientLayout>
  );
}
