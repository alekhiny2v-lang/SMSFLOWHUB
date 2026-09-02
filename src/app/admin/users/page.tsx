"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
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

  const load = () => apiFetch<User[]>("/api/admin/users").then(setUsers);

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

  const filteredRates = rates.filter((r) =>
    r.countryName.toLowerCase().includes(rateSearch.toLowerCase()) ||
    r.countryCode.toLowerCase().includes(rateSearch.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Users</h1>
          <p className="text-slate-400 text-sm mt-1">Manage clients, balance, rates and payment details</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition"
        >
          + Add User
        </button>
      </div>

      {showAdd && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-5 animate-fade-in">
          <h3 className="font-bold text-white mb-4">Add User</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
            <input placeholder="Balance" type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm flex-1 transition">Save</button>
              <button type="button" onClick={() => setShowAdd(false)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm flex-1 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {balanceForm.userId && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-5 animate-fade-in">
          <h3 className="font-bold text-white mb-4">Update Balance</h3>
          <form onSubmit={handleBalance} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input placeholder="Amount" type="number" value={balanceForm.amount} onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <select value={balanceForm.type} onChange={(e) => setBalanceForm({ ...balanceForm, type: e.target.value as "add" | "deduct" })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
            <input placeholder="Notes" value={balanceForm.notes} onChange={(e) => setBalanceForm({ ...balanceForm, notes: e.target.value })} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold text-sm flex-1 transition">Update</button>
              <button type="button" onClick={() => setBalanceForm({ userId: null, amount: "", type: "add", notes: "" })} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm flex-1 transition">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {ratesUserId && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="font-bold text-white text-lg">Custom Rates (PKR) — User #{ratesUserId}</h3>
            <div className="flex gap-2">
              <input placeholder="Search country..." value={rateSearch} onChange={(e) => setRateSearch(e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => setRatesUserId(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm transition">Close</button>
            </div>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <TableCard>
              <table className="w-full text-left text-sm min-w-[500px]">
                <thead className="bg-slate-800/80 text-slate-300 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Default Rate</th>
                    <th className="px-4 py-3">Custom Rate (PKR)</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {filteredRates.map((r) => (
                    <tr key={r.countryId} className="border-t border-white/5">
                      <td className="px-4 py-3 font-medium text-white">{r.countryName}</td>
                      <td className="px-4 py-3 text-slate-400">{r.defaultPkrPrice ? `PKR ${r.defaultPkrPrice.toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-3">
                        <input type="number" step="0.01" defaultValue={r.customPkrPrice ?? ""} placeholder="Use default" onBlur={(e) => updateRate(r.countryId, e.target.value)} className="bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-36" />
                      </td>
                      <td className="px-4 py-3">
                        {r.customPkrPrice !== null && (
                          <button onClick={() => updateRate(r.countryId, "")} className="text-red-400 hover:text-red-300 text-xs font-medium">Reset</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>
          </div>
          <p className="text-xs text-slate-500 mt-3">Leave empty and blur to use default rate. Enter 0 or blank to reset custom rate.</p>
        </div>
      )}

      {paymentUserId && (
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 mb-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white text-lg">Payment Details — User #{paymentUserId}</h3>
            <button onClick={() => setPaymentUserId(null)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm transition">Close</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentMethods.length === 0 && (
              <p className="text-slate-500 text-sm">No payment methods added</p>
            )}
            {paymentMethods.map((pm) => (
              <div key={pm.id} className={`bg-slate-950/50 border rounded-xl p-4 ${pm.isDefault ? "border-emerald-500/30" : "border-white/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-white">{pm.type}</span>
                  {pm.isDefault && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">Default</span>}
                </div>
                <p className="text-slate-300 text-sm">{pm.accountName}</p>
                <p className="text-slate-400 text-sm font-mono">{pm.accountNumber}</p>
                {pm.notes && <p className="text-slate-500 text-xs mt-1">{pm.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <TableCard>
        <table className="w-full text-left text-sm min-w-[900px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Username</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Balance</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Joined</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{u.id}</td>
                <td className="px-5 py-4 font-medium text-white">{u.username}</td>
                <td className="px-5 py-4 capitalize">{u.role}</td>
                <td className="px-5 py-4">PKR {Number(u.balance).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{u.status}</span>
                </td>
                <td className="px-5 py-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4 space-x-3">
                  <button onClick={() => setBalanceForm({ userId: u.id, amount: "", type: "add", notes: "" })} className="text-blue-400 hover:text-blue-300 font-medium">Balance</button>
                  {u.role === "client" && (
                    <>
                      <button onClick={() => loadRates(u.id)} className="text-emerald-400 hover:text-emerald-300 font-medium">Rates</button>
                      <button onClick={() => loadPaymentMethods(u.id)} className="text-purple-400 hover:text-purple-300 font-medium">Payments</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </AdminLayout>
  );
}
