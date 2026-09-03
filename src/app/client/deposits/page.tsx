"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  status: string;
  method: string;
  reference: string;
  notes: string;
  createdAt: string;
}

interface DepositAccount {
  id: number;
  type: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

const ACCOUNT_STYLE: Record<string, { icon: string; tile: string }> = {
  JazzCash: { icon: "📱", tile: "bg-red-500/10 border-red-500/25" },
  EasyPaisa: { icon: "💚", tile: "bg-emerald-500/10 border-emerald-500/25" },
  NayaPay: { icon: "💳", tile: "bg-indigo-500/10 border-indigo-500/25" },
  SadaPay: { icon: "🧡", tile: "bg-orange-500/10 border-orange-500/25" },
  "Bank Transfer": { icon: "🏦", tile: "bg-blue-500/10 border-blue-500/25" },
  Cryptocurrency: { icon: "₿", tile: "bg-amber-500/10 border-amber-500/25" },
  Other: { icon: "💰", tile: "bg-white/5 border-white/10" },
};

export default function ClientDeposits() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<DepositAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = () => {
    Promise.all([
      apiFetch<Transaction[]>("/api/client/deposits").catch(() => []),
      apiFetch<DepositAccount[]>("/api/client/deposit-accounts").catch(() => []),
    ]).then(([t, a]) => {
      setTransactions(t);
      setAccounts(a);
      setLoaded(true);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const copyAccount = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      await apiFetch("/api/client/deposits", {
        method: "POST",
        body: JSON.stringify({ amount, reference, notes }),
      });
      setAmount("");
      setReference("");
      setNotes("");
      setMessage("Deposit request submitted — an admin will approve it shortly.");
      setIsError(false);
      load();
    } catch (err) {
      setMessage((err as Error).message);
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ClientLayout>
      <PageHero
        eyebrow="Wallet"
        title="Add Funds"
        description="Send money to any account below, then submit the reference for approval. Funds land in your balance as soon as an admin confirms."
        icon={<span>💰</span>}
      />

      {/* ── Where to send ── */}
      {accounts.length > 0 && (
        <div className="mt-5">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
            Send money to
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map((a) => {
              const style = ACCOUNT_STYLE[a.type] ?? ACCOUNT_STYLE.Other;
              return (
                <div key={a.id} className="bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl p-5 card-hover hover:border-[#1877F2]/40 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`grid place-items-center w-10 h-10 rounded-xl border text-lg shrink-0 ${style.tile}`}>{style.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{a.type}</h3>
                        <p className="text-[11px] text-slate-500 truncate">{a.accountName}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyAccount(a.accountNumber, a.id)}
                      className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition ${
                        copiedId === a.id
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {copiedId === a.id ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-emerald-400 font-mono font-bold text-lg tracking-wide text-center bg-slate-950/60 rounded-xl py-2.5 border border-white/5">
                    {a.accountNumber}
                  </p>
                  {a.instructions && <p className="text-slate-500 text-xs mt-2.5 leading-relaxed">💡 {a.instructions}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Request form ── */}
      <div className="mt-6 rounded-2xl border border-[#1877F2]/25 bg-slate-900/90 shadow-xl p-5 relative overflow-hidden">
        <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[#1877F2]/15 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <h3 className="font-bold text-white mb-1 flex items-center gap-2">
            <span className="grid place-items-center w-7 h-7 rounded-lg fb-gradient text-white text-xs font-bold">2</span>
            Submit your deposit
          </h3>
          <p className="text-xs text-slate-500 mb-4 ml-9">Enter the amount you sent and the transaction reference so we can match it.</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="label" htmlFor="dep-amount">Amount (PKR)</label>
              <input id="dep-amount" placeholder="e.g. 500" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="dep-ref">Transaction reference</label>
              <input id="dep-ref" placeholder="e.g. TID-123456" value={reference} onChange={(e) => setReference(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="dep-notes">Notes (optional)</label>
              <input id="dep-notes" placeholder="Anything useful" value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting} className="btn-primary btn-shine w-full py-2.5!">
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70" />
                    Submitting…
                  </>
                ) : (
                  "Submit request"
                )}
              </button>
            </div>
          </form>
          {message && (
            <p className={`mt-4 text-sm rounded-xl px-4 py-3 border ${isError ? "text-red-300 bg-red-500/10 border-red-500/25" : "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"}`}>
              {isError ? "⚠ " : "✓ "}{message}
            </p>
          )}
        </div>
      </div>

      {/* ── History ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">📜</span>
          Deposit History
        </h2>
      </div>

      {!loaded ? (
        <TableSkeleton rows={4} cols={5} />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No deposit requests yet"
          description="Your submitted deposits and their approval status will appear here."
        />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr>
                <th className="th">Type</th>
                <th className="th">Amount</th>
                <th className="th">Status</th>
                <th className="th">Reference</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="tr-hover">
                  <td className="td font-semibold text-white">{t.type}</td>
                  <td className="td font-bold text-emerald-400 tabular-nums">PKR {Number(t.amount).toFixed(2)}</td>
                  <td className="td">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="td font-mono text-slate-400">{t.reference || "-"}</td>
                  <td className="td text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </ClientLayout>
  );
}
