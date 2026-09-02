"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
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
  const load = () => apiFetch<Transaction[]>("/api/admin/transactions?status=pending").then(setTransactions);

  useEffect(() => {
    load();
  }, []);

  const process = async (id: number, status: "completed" | "rejected") => {
    await apiFetch(`/api/admin/transactions/${id}`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    load();
  };

  return (
    <AdminLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Pending Deposits</h1>
        <p className="text-slate-400 text-sm mt-1">Approve or reject client deposit requests</p>
      </div>
      <TableCard>
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Method</th>
              <th className="px-5 py-4">Reference</th>
              <th className="px-5 py-4">Notes</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{t.id}</td>
                <td className="px-5 py-4 font-medium text-white">{t.username || t.userId}</td>
                <td className="px-5 py-4">{t.type}</td>
                <td className="px-5 py-4">PKR {Number(t.amount).toFixed(2)}</td>
                <td className="px-5 py-4">{t.method}</td>
                <td className="px-5 py-4">{t.reference || "-"}</td>
                <td className="px-5 py-4">{t.notes || "-"}</td>
                <td className="px-5 py-4">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="px-5 py-4 space-x-2">
                  <button onClick={() => process(t.id, "completed")} className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Approve</button>
                  <button onClick={() => process(t.id, "rejected")} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition">Reject</button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-slate-500">No pending deposits</td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </AdminLayout>
  );
}
