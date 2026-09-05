"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { EmptyState, PageHero, StatusPill, TableSkeleton } from "@/components/ui";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  username: string;
  role: string;
  balance: string;
  status: string;
  createdAt: string;
}

interface UserRate {
  countryId: number;
  countryName: string;
  countryCode: string;
  defaultPkrPrice: number | null;
  customPkrPrice: number | null;
  rateId: number | null;
}

interface PaymentMethod {
  id: number;
  type: string;
  accountName: string;
  accountNumber: string;
  notes: string;
  isDefault: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "client", balance: 0 });
  const [balanceForm, setBalanceForm] = useState<{ userId: number | null; amount: string; type: "add" | "deduct"; notes: string }>({
    userId: null,
    amount: "",
    type: "add",
    notes: "",
  });
  const [ratesUserId, setRatesUserId] = useState<number | null>(null);
  const [rates, setRates] = useState<UserRate[]>([]);
  const [rateSearch, setRateSearch] = useState("");
  const [paymentUserId, setPaymentUserId] = useState<number | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const load = () =>
    apiFetch<User[]>("/api/admin/users")
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoaded(true));

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setShowAdd(false);
    setForm({ username: "", password: "", role: "client", balance: 0 });
    load();
  };

  const handleBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceForm.userId) return;
    await apiFetch(`/api/admin/users/${balanceForm.userId}/balance`, {
      method: "POST",
      body: JSON.stringify({
        amount: balanceForm.amount,
        type: balanceForm.type,
        notes: balanceForm.notes,
      }),
    });
    setBalanceForm({ userId: null, amount: "", type: "add", notes: "" });
    load();
  };

  const loadRates = async (userId: number) => {
    const data = await apiFetch<UserRate[]>(`/api/admin/users/${userId}/rates`);
    setRates(data);
    setRatesUserId(userId);
  };

  const loadPaymentMethods = async (userId: number) => {
    const data = await apiFetch<PaymentMethod[]>(`/api/admin/users/${userId}/payment-methods`);
    setPaymentMethods(data);
    setPaymentUserId(userId);
  };

  const updateRate = async (countryId: number, price: string) => {
    if (!ratesUserId) return;
    if (price === "" || price === "0") {
      const rate = rates.find((r) => r.countryId === countryId);
      if (rate?.rateId) {
        await apiFetch(`/api/admin/users/${ratesUserId}/rates/${rate.rateId}`, { method: "DELETE" });
      }
    } else {
      await apiFetch(`/api/admin/users/${ratesUserId}/rates`, {
        method: "POST",
        body: JSON.stringify({ countryId, pkrPrice: Number(price) }),
      });
    }
    loadRates(ratesUserId);
    load();
  };

  const filteredRates = rates.filter(
    (r) => r.countryName.toLowerCase().includes(rateSearch.toLowerCase()) || r.countryCode.toLowerCase().includes(rateSearch.toLowerCase())
  );

  const balanceUser = users.find((u) => u.id === balanceForm.userId);
  const ratesUser = users.find((u) => u.id === ratesUserId);
  const paymentUser = users.find((u) => u.id === paymentUserId);

  return (
    <AdminLayout>
      <PageHero
        eyebrow="Admin"
        title="Users"
        description="Manage clients and admins, adjust balances, set custom country rates and review payout details."
        icon={<span>👥</span>}
      >
        <button onClick={() => setShowAdd((v) => !v)} className="btn-primary btn-shine">
          {showAdd ? "Close form" : "+ Add user"}
        </button>
      </PageHero>

      {/* ── Add user ── */}
      {showAdd && (
        <div className="bg-surface/90 border border-brand/25 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <h3 className="font-bold text-white mb-4">Add a new user</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className="label">Username</label>
              <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Starting balance (PKR)</label>
              <input placeholder="Balance" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} className="input" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Update balance ── */}
      {balanceForm.userId && (
        <div className="bg-surface/90 border border-emerald-500/25 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <h3 className="font-bold text-white mb-1">
            Update balance — <span className="text-emerald-400">{balanceUser?.username ?? `#${balanceForm.userId}`}</span>{" "}
            <span className="text-muted font-normal text-sm">current: PKR {balanceUser ? Number(balanceUser.balance).toFixed(2) : "—"}</span>
          </h3>
          <p className="text-xs text-muted mb-4">Every adjustment is logged as a transaction.</p>
          <form onSubmit={handleBalance} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className="label">Amount (PKR)</label>
              <input placeholder="Amount" type="number" step="0.01" value={balanceForm.amount} onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="label">Operation</label>
              <select value={balanceForm.type} onChange={(e) => setBalanceForm({ ...balanceForm, type: e.target.value as "add" | "deduct" })} className="input">
                <option value="add">Add to balance</option>
                <option value="deduct">Deduct from balance</option>
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input placeholder="Notes" value={balanceForm.notes} onChange={(e) => setBalanceForm({ ...balanceForm, notes: e.target.value })} className="input" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1">Update</button>
              <button type="button" onClick={() => setBalanceForm({ userId: null, amount: "", type: "add", notes: "" })} className="btn-ghost flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Custom rates ── */}
      {ratesUserId && (
        <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-white text-lg">Custom rates (PKR) — {ratesUser?.username ?? `#${ratesUserId}`}</h3>
              <p className="text-xs text-muted mt-0.5">Leave empty to inherit the default country rate.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">⌕</span>
                <input placeholder="Search country…" value={rateSearch} onChange={(e) => setRateSearch(e.target.value)} className="input pl-8! w-48! py-2! text-xs" />
              </div>
              <button onClick={() => setRatesUserId(null)} className="btn-ghost py-2!">Close</button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead>
                <tr>
                  <th className="th sticky top-0">Country</th>
                  <th className="th sticky top-0">Default rate</th>
                  <th className="th sticky top-0">Custom rate (PKR)</th>
                  <th className="th sticky top-0">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((r) => (
                  <tr key={r.countryId} className="tr-hover">
                    <td className="td font-semibold text-white">{r.countryName}</td>
                    <td className="td text-muted tabular-nums">{r.defaultPkrPrice ? `PKR ${r.defaultPkrPrice.toFixed(2)}` : "-"}</td>
                    <td className="td">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={r.customPkrPrice ?? ""}
                        placeholder="Use default"
                        onBlur={(e) => updateRate(r.countryId, e.target.value)}
                        className="input w-36! py-1.5! focus:ring-emerald-500/20! focus:border-emerald-500/50!"
                      />
                    </td>
                    <td className="td">
                      {r.customPkrPrice !== null && (
                        <button onClick={() => updateRate(r.countryId, "")} className="text-red-400 hover:text-red-300 text-xs font-bold underline underline-offset-2">
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRates.length === 0 && (
                  <tr>
                    <td colSpan={4} className="td text-center text-muted py-6">No country matches “{rateSearch}”.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment methods ── */}
      {paymentUserId && (
        <div className="bg-surface/90 border border-white/10 rounded-2xl shadow-xl p-5 mt-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-white text-lg">Payout details — {paymentUser?.username ?? `#${paymentUserId}`}</h3>
              <p className="text-xs text-muted mt-0.5">Accounts the client registered for refunds.</p>
            </div>
            <button onClick={() => setPaymentUserId(null)} className="btn-ghost py-2!">Close</button>
          </div>
          {paymentMethods.length === 0 ? (
            <EmptyState icon="💳" title="No payment methods" description="This client has not registered any payout account yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map((pm) => (
                <div key={pm.id} className={`bg-canvas/50 border rounded-xl p-4 ${pm.isDefault ? "border-emerald-500/30" : "border-white/5"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white">{pm.type}</span>
                    {pm.isDefault && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/25">Default</span>}
                  </div>
                  <p className="text-fg-soft text-sm">{pm.accountName}</p>
                  <p className="text-muted text-sm font-mono">{pm.accountNumber}</p>
                  {pm.notes && <p className="text-muted text-xs mt-1">{pm.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Users table ── */}
      <div className="flex items-center justify-between gap-3 mt-8 mb-4 flex-wrap">
        <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">📋</span>
          All Users
          {loaded && (
            <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5 tabular-nums">
              {users.length}
            </span>
          )}
        </h2>
      </div>

      {!loaded ? (
        <TableSkeleton rows={5} cols={7} />
      ) : users.length === 0 ? (
        <EmptyState icon="👥" title="No users yet" description="Create the first client account with the Add user button." />
      ) : (
        <TableCard>
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr>
                <th className="th">ID</th>
                <th className="th">Username</th>
                <th className="th">Role</th>
                <th className="th">Balance</th>
                <th className="th">Status</th>
                <th className="th">Joined</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="tr-hover">
                  <td className="td text-muted tabular-nums">{u.id}</td>
                  <td className="td">
                    <span className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-7 h-7 rounded-lg bg-brand/15 border border-brand/30 text-white text-[10px] font-bold shrink-0">
                        {u.username.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-semibold text-white">{u.username}</span>
                    </span>
                  </td>
                  <td className="td">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${
                        u.role === "admin" ? "bg-purple-500/10 text-purple-300 border-purple-500/25" : "bg-brand/10 text-brand-soft border-brand/25"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="td font-bold text-emerald-400 tabular-nums">PKR {Number(u.balance).toFixed(2)}</td>
                  <td className="td">
                    <StatusPill status={u.status} />
                  </td>
                  <td className="td text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="td">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={() => setBalanceForm({ userId: u.id, amount: "", type: "add", notes: "" })}
                        className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                      >
                        Balance
                      </button>
                      {u.role === "client" && (
                        <>
                          <button
                            onClick={() => loadRates(u.id)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition"
                          >
                            Rates
                          </button>
                          <button
                            onClick={() => loadPaymentMethods(u.id)}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition"
                          >
                            Payments
                          </button>
                        </>
                      )}
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
