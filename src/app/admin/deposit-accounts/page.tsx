"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatusPill, TableSkeleton } from "@/components/ui";
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

const TYPE_ICON: Record<string, string> = {
  JazzCash: "📱",
  EasyPaisa: "💚",
  NayaPay: "💳",
  SadaPay: "🧡",
  "Bank Transfer": "🏦",
  Cryptocurrency: "₿",
  Other: "💰",
};

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
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () =>
    apiFetch<DepositAccount[]>("/api/admin/deposit-accounts")
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoaded(true));

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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this deposit account?")) return;
    await apiFetch(`/api/admin/deposit-accounts/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Deposit Accounts"
        description="These accounts are shown to clients on the Add Funds page. Keep only the ones you actively monitor."
        icon={<span>🏦</span>}
      />

      {/* ── Add / edit form ── */}
      <div className="bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5">
        <h3 className="font-bold text-white text-lg mb-4">{editingId ? `Edit account #${editingId}` : "Add deposit account"}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="label">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
              {accountTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Account name / title</label>
            <input placeholder="e.g. SMSFlow Ltd" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Account number / wallet</label>
            <input placeholder="e.g. 0300 1234567" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="label">Sort order</label>
            <input placeholder="0" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Instructions for clients (optional)</label>
            <input placeholder="e.g. Send from the same number every time" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="input" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 w-full">
              <input id="account-active" type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="w-4 h-4 rounded accent-[#1877F2]" />
              <span className="text-sm text-slate-300 font-semibold">Visible to clients</span>
            </label>
          </div>
          <div className="flex gap-2 md:col-span-2 xl:col-span-4">
            <button type="submit" className="btn-primary btn-shine">{editingId ? "Update account" : "Add account"}</button>
            {editingId && (
              <button type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }} className="btn-ghost">
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Accounts table ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">📒</span>
          Receiving Accounts
          {loaded && (
            <span className="text-[11px] font-bold bg-[#1877F2]/15 text-[#8ab9f9] border border-[#1877F2]/30 rounded-full px-2 py-0.5 tabular-nums">
              {accounts.length}
            </span>
          )}
        </h2>
      </div>

      {!loaded ? (
        <TableSkeleton rows={4} cols={7} />
      ) : accounts.length === 0 ? (
        <EmptyState icon="🏦" title="No accounts yet" description="Add your first receiving account so clients can send you money." />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr>
                <th className="th">Type</th>
                <th className="th">Account name</th>
                <th className="th">Account number</th>
                <th className="th">Instructions</th>
                <th className="th">Status</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="tr-hover">
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-sm">{TYPE_ICON[a.type] ?? "💰"}</span>
                      <span className="font-semibold text-white">{a.type}</span>
                    </span>
                  </td>
                  <td className="td">{a.accountName}</td>
                  <td className="td font-mono text-emerald-400 font-semibold">{a.accountNumber}</td>
                  <td className="td text-slate-400 max-w-[220px] truncate">{a.instructions || "-"}</td>
                  <td className="td">
                    <StatusPill status={a.active ? "active" : "inactive"} />
                  </td>
                  <td className="td">
                    <span className="flex items-center gap-1.5">
                      <button onClick={() => edit(a)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 transition">
                        Edit
                      </button>
                      <button onClick={() => remove(a.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition">
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </AdminLayout>
  );
}
