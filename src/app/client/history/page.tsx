"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatCard, StatCardSkeleton, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Activation {
  id: number;
  countryName: string;
  phoneNumber: string;
  cost: string;
  status: string;
  smsCode: string | null;
  createdAt: string;
}

export default function ClientHistory() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "cancelled">("all");
  const [copiedNumberId, setCopiedNumberId] = useState<number | null>(null);
  const [copiedOtpId, setCopiedOtpId] = useState<number | null>(null);

  const copy = async (text: string, id: number, kind: "number" | "otp") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "number") {
        setCopiedNumberId(id);
        setTimeout(() => setCopiedNumberId(null), 1500);
      } else {
        setCopiedOtpId(id);
        setTimeout(() => setCopiedOtpId(null), 1500);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    apiFetch<Activation[]>("/api/client/activations")
      .then(setActivations)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const filtered = activations.filter((a) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      a.countryName.toLowerCase().includes(q) ||
      (a.phoneNumber || "").includes(q) ||
      (a.smsCode || "").includes(q);
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalSpent = activations
    .filter((a) => a.status !== "cancelled")
    .reduce((s, a) => s + Number(a.cost || 0), 0);
  const completed = activations.filter((a) => a.status === "completed").length;

  return (
    <ClientLayout>
      <PageHero
        eyebrow="Activity"
        title="My Numbers"
        description="Every number you have ordered, with its OTP code and final status."
        icon={<span>📜</span>}
      />

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        {!loaded ? (
          Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total numbers" value={activations.length} hint="all-time purchases" icon="📱" tone="blue" />
            <StatCard label="Codes received" value={completed} hint="successfully verified" icon="✅" tone="emerald" />
            <StatCard label="Total spent" value={`PKR ${totalSpent.toFixed(2)}`} hint="refunds excluded" icon="💰" tone="white" />
          </>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🗂️</span>
          Order History
          {loaded && (
            <span className="text-[11px] font-bold bg-[#1877F2]/15 text-[#8ab9f9] border border-[#1877F2]/30 rounded-full px-2 py-0.5 tabular-nums">
              {filtered.length}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country, number, code…"
              className="input pl-8! w-56! py-2! text-xs"
            />
          </div>
          {(["all", "completed", "pending", "cancelled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-[38px] px-3 rounded-xl text-xs font-bold border capitalize transition ${
                statusFilter === s
                  ? "bg-[#1877F2]/15 border-[#1877F2]/45 text-[#8ab9f9]"
                  : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <TableSkeleton rows={6} cols={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📭"
          title={activations.length === 0 ? "No numbers yet" : "Nothing matches that filter"}
          description={
            activations.length === 0
              ? "Your purchased numbers and their OTP codes will be listed here."
              : "Try a different search term or status filter."
          }
        />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr>
                <th className="th">Country</th>
                <th className="th">Phone</th>
                <th className="th">Price</th>
                <th className="th">Status</th>
                <th className="th">Code</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="tr-hover">
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{getCountryFlagByName(a.countryName)}</span>
                      <span className="font-semibold text-white">{a.countryName || "-"}</span>
                    </span>
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-2 font-mono">
                      {a.phoneNumber || "-"}
                      {a.phoneNumber && (
                        <button
                          onClick={() => copy(a.phoneNumber || "", a.id, "number")}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition ${
                            copiedNumberId === a.id
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/25"
                          }`}
                          title="Copy number"
                        >
                          {copiedNumberId === a.id ? "✓" : "Copy"}
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="td tabular-nums font-semibold">PKR {Number(a.cost).toFixed(2)}</td>
                  <td className="td">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-2 font-mono font-bold">
                      {a.smsCode ? (
                        <>
                          <span className="text-emerald-400 tracking-wider">{a.smsCode}</span>
                          <button
                            onClick={() => copy(a.smsCode || "", a.id, "otp")}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition ${
                              copiedOtpId === a.id
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/25"
                            }`}
                            title="Copy OTP"
                          >
                            {copiedOtpId === a.id ? "✓" : "Copy"}
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </span>
                  </td>
                  <td className="td text-slate-400">{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </ClientLayout>
  );
}
