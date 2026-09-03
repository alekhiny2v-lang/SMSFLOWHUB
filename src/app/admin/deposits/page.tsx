"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";

interface Transaction {
  id: number;
  userId: number;
  username: string;
  type: string;
  amount: string;
  status: string;
  method: string;
  reference: string;
  notes: string;
  createdAt: string;
}

export default function AdminDeposits() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = () =>
    apiFetch<Transaction[]>("/api/admin/transactions?status=pending")
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
  }, []);

  const process = async (id: number, status: "completed" | "rejected") => {
    setProcessingId(id);
    try {
      await apiFetch(`/api/admin/transactions/${id}`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Pending Deposits"
        description="Verify each transaction reference before approving — approved amounts are credited to the client's balance instantly."
        icon={<span>💰</span>}
      >
        <span className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2 text-[11px] font-bold text-amber-300">
          ⏳ {transactions.length} waiting · PKR {totalPending.toFixed(2)}
        </span>
      </PageHero>

      <div className="mt-8">
        {!loaded ? (
          <TableSkeleton rows={4} cols={9} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon="✅"
            title="No pending deposits"
            description="All caught up — new client deposit requests will appear here for approval."
          />
        ) : (
          <TableCard>
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr>
                  <th className="th">ID</th>
                  <th className="th">User</th>
                  <th className="th">Type</th>
                  <th className="th">Amount</th>
                  <th className="th">Method</th>
                  <th className="th">Reference</th>
                  <th className="th">Notes</th>
                  <th className="th">Date</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="tr-hover">
                    <td className="td text-slate-500 tabular-nums">{t.id}</td>
                    <td className="td font-semibold text-white">{t.username || t.userId}</td>
                    <td className="td">{t.type}</td>
                    <td className="td font-bold text-emerald-400 tabular-nums">PKR {Number(t.amount).toFixed(2)}</td>
                    <td className="td">{t.method}</td>
                    <td className="td font-mono text-slate-400">{t.reference || "-"}</td>
                    <td className="td text-slate-400 max-w-[160px] truncate">{t.notes || "-"}</td>
                    <td className="td text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="td">
                      <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => process(t.id, "completed")}
                          disabled={processingId === t.id}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition disabled:opacity-50"
                        >
                          {processingId === t.id ? "…" : "✓ Approve"}
                        </button>
                        <button
                          onClick={() => process(t.id, "rejected")}
                          disabled={processingId === t.id}
                          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>
    </AdminLayout>
  );
}
