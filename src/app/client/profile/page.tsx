"use client";

import { useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { apiFetch } from "@/lib/api";

export default function ClientProfile() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

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

  return (
    <ClientLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your SMSFlow account security</p>
      </div>

      {message && (
        <div className={`rounded-xl p-4 mb-5 ${message.includes("success") ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
          <p className={`text-sm ${message.includes("success") ? "text-emerald-300" : "text-red-300"}`}>{message}</p>
        </div>
      )}

      <div className="max-w-xl">
        <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-6">
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
      </div>
    </ClientLayout>
  );
}
