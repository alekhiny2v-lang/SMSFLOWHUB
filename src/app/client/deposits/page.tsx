"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
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

export default function ClientDeposits() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<DepositAccount[]>([]);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    apiFetch<Transaction[]>("/api/client/deposits").then(setTransactions);
    apiFetch<DepositAccount[]>("/api/client/deposit-accounts").then(setAccounts);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      await apiFetch("/api/client/deposits", {
        method: "POST",
        body: JSON.stringify({ amount, reference, notes }),
      });
      setAmount("");
      setReference("");
      setNotes("");
      setMessage("Deposit request submitted for approval.");
      load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <ClientLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Deposits</h1>
        <p className="text-slate-400 text-sm mt-1">Request balance deposit to your SMSFlow wallet</p>
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {accounts.map((a) => (
            <div key={a.id} className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 card-hover">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{getAccountIcon(a.type)}</span>
                <h3 className="font-bold text-white">{a.type}</h3>
              </div>
              <p className="text-slate-300 text-sm mb-1">{a.accountName}</p>
              <p className="text-emerald-400 font-mono font-bold text-lg">{a.accountNumber}</p>
              {a.instructions && <p className="text-slate-500 text-xs mt-2">{a.instructions}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-6">
        <h3 className="font-bold text-white mb-4">Request Deposit</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <input placeholder="Amount (PKR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Transaction Reference" value={reference} onChange={(e) => setReference(e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition">
            Submit Request
          </button>
        </form>
        {message && <p className={`mt-4 text-sm ${message.includes("submitted") ? "text-emerald-400" : "text-red-400"}`}>{message}</p>}
      </div>

      <TableCard>
        <table className="w-full text-left text-sm min-w-[500px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Reference</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{t.type}</td>
                <td className="px-5 py-4">PKR {Number(t.amount).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(t.status)}`}>{t.status}</span>
                </td>
                <td className="px-5 py-4">{t.reference || "-"}</td>
                <td className="px-5 py-4">{new Date(t.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </ClientLayout>
  );
}

function getAccountIcon(type: string) {
  const map: Record<string, string> = {
    JazzCash: "📱",
    EasyPaisa: "💚",
    NayaPay: "💳",
    SadaPay: "🧡",
    "Bank Transfer": "🏦",
    Cryptocurrency: "₿",
    Other: "💰",
  };
  return map[type] || "💰";
}

function getStatusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === "pending") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  if (status === "rejected") return "bg-red-500/10 text-red-400 border border-red-500/20";
  return "bg-slate-500/10 text-slate-400";
}
