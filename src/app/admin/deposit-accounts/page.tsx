"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { apiFetch } from "@/lib/api";

interface DepositAccount {
  id: number;
  type: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  active: boolean;
  sortOrder: number;
}

const accountTypes = ["JazzCash", "EasyPaisa", "NayaPay", "SadaPay", "Bank Transfer", "Cryptocurrency", "Other"];

const emptyForm = {
  type: "JazzCash",
  accountName: "",
  accountNumber: "",
  instructions: "",
  active: true,
  sortOrder: 0,
};

export default function AdminDepositAccounts() {
  const [accounts, setAccounts] = useState<DepositAccount[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () => apiFetch<DepositAccount[]>("/api/admin/deposit-accounts").then(setAccounts);

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/api/admin/deposit-accounts/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
    } else {
      await apiFetch("/api/admin/deposit-accounts", {
        method: "POST",
        body: JSON.stringify(form),
      });
    }
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const edit = (a: DepositAccount) => {
    setEditingId(a.id);
    setForm({
      type: a.type,
      accountName: a.accountName,
      accountNumber: a.accountNumber,
      instructions: a.instructions,
      active: a.active,
      sortOrder: a.sortOrder,
    });
  };

  const remove = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this deposit account?")) return;
    await apiFetch(`/api/admin/deposit-accounts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Deposit Accounts</h1>
          <p className="text-slate-400 text-sm mt-1">Add payment receiving accounts for clients</p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-6">
        <h3 className="font-bold text-white text-lg mb-4">{editingId ? "Edit Account" : "Add Deposit Account"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {accountTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input placeholder="Account Name / Title" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Account Number / Wallet" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          <input placeholder="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="Instructions for client (optional)" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
          <div className="flex items-center gap-3">
            <input id="active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-5 h-5 rounded border-white/10 bg-slate-950/50 text-blue-600" />
            <label htmlFor="active" className="text-slate-300 text-sm">Active</label>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition">
              {editingId ? "Update Account" : "Add Account"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-sm transition">Cancel</button>
            )}
          </div>
        </form>
      </div>

      <TableCard>
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Account Name</th>
              <th className="px-5 py-4">Account Number</th>
              <th className="px-5 py-4">Instructions</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{a.id}</td>
                <td className="px-5 py-4 font-medium text-white">{a.type}</td>
                <td className="px-5 py-4">{a.accountName}</td>
                <td className="px-5 py-4 font-mono">{a.accountNumber}</td>
                <td className="px-5 py-4">{a.instructions || "-"}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${a.active ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{a.active ? "Active" : "Inactive"}</span>
                </td>
                <td className="px-5 py-4 space-x-3">
                  <button onClick={() => edit(a)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                  <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </AdminLayout>
  );
}
