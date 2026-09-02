"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { apiFetch } from "@/lib/api";

interface PaymentMethod {
  id: number;
  type: string;
  accountName: string;
  accountNumber: string;
  notes: string;
  isDefault: boolean;
}

const paymentTypes = ["JazzCash", "EasyPaisa", "Bank Transfer", "Cryptocurrency", "Other"];

export default function ClientProfile() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: "JazzCash",
    accountName: "",
    accountNumber: "",
    notes: "",
    isDefault: false,
  });

  const loadPaymentMethods = () => apiFetch<PaymentMethod[]>("/api/client/payment-methods").then(setPaymentMethods);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      await apiFetch("/api/client/profile", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, password }),
      });
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setMessage("Password updated successfully");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      await apiFetch("/api/client/payment-methods", {
        method: "POST",
        body: JSON.stringify(paymentForm),
      });
      setPaymentForm({ type: "JazzCash", accountName: "", accountNumber: "", notes: "", isDefault: false });
      setShowAddPayment(false);
      loadPaymentMethods();
      setMessage("Payment method added");
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const deletePayment = async (id: number) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this payment method?")) return;
    await apiFetch(`/api/client/payment-methods/${id}`, { method: "DELETE" });
    loadPaymentMethods();
  };

  const setDefault = async (id: number) => {
    await apiFetch(`/api/client/payment-methods/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isDefault: true }),
    });
    loadPaymentMethods();
  };

  return (
    <ClientLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your SMSFlow account security and payment details</p>
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-5 ${message.includes("success") || message.includes("added") ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <p className={`text-sm ${message.includes("success") || message.includes("added") ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Password Change */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-6">
          <h3 className="font-bold text-white text-lg mb-5">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" required />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition">
              Update Password
            </button>
          </form>
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-white text-lg">Payment Details</h3>
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              {showAddPayment ? "Cancel" : "+ Add Method"}
            </button>
          </div>

          {showAddPayment && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 mb-5 animate-fade-in">
              <select
                value={paymentForm.type}
                onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {paymentTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input placeholder="Account Name / Title" value={paymentForm.accountName} onChange={(e) => setPaymentForm({ ...paymentForm, accountName: e.target.value })} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              <input placeholder="Account Number / IBAN / Wallet" value={paymentForm.accountNumber} onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" required />
              <input placeholder="Notes (optional)" value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={paymentForm.isDefault} onChange={(e) => setPaymentForm({ ...paymentForm, isDefault: e.target.checked })} className="w-4 h-4 rounded border-white/10 bg-slate-950/50 text-emerald-600" />
                Set as default
              </label>
              <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition">
                Save Payment Method
              </button>
            </form>
          )}

          <div className="space-y-3">
            {paymentMethods.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No payment methods added</p>
            )}
            {paymentMethods.map((pm) => (
              <div key={pm.id} className={`bg-slate-950/50 border rounded-xl p-4 ${pm.isDefault ? "border-emerald-500/30" : "border-white/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{pm.type}</span>
                      {pm.isDefault && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">Default</span>}
                    </div>
                    <p className="text-slate-300 text-sm">{pm.accountName}</p>
                    <p className="text-slate-400 text-sm font-mono">{pm.accountNumber}</p>
                    {pm.notes && <p className="text-slate-500 text-xs mt-1">{pm.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    {!pm.isDefault && (
                      <button onClick={() => setDefault(pm.id)} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Set Default</button>
                    )}
                    <button onClick={() => deletePayment(pm.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
