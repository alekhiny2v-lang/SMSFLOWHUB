"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { InfoRow, PageHero } from "@/components/ui";
import { apiFetch } from "@/lib/api";

export default function ClientProfile() {
  const [me, setMe] = useState<{ username: string; role: string; balance: string; createdAt?: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ username: string; role: string; balance: string; createdAt?: string }>("/api/auth/me")
      .then(setMe)
      .catch(() => {});
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirm) {
      setMessage("Passwords do not match");
      setIsError(true);
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/client/profile", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, password }),
      });
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      setMessage("Password updated successfully");
      setIsError(false);
    } catch (err) {
      setMessage((err as Error).message);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ClientLayout>
      <PageHero
        eyebrow="Account"
        title="Profile & Security"
        description="Review your account details and keep your password strong."
        icon={<span>⚙️</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-6 items-start">
        {/* ── Account card ── */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-surface/90 shadow-xl p-6 relative overflow-hidden">
          <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-brand/15 blur-3xl" aria-hidden="true" />
          <div className="relative flex flex-col items-center text-center border-b border-white/5 pb-5 mb-2">
            <span className="grid place-items-center w-16 h-16 rounded-2xl brand-gradient text-ink text-xl font-bold shadow-lg shadow-brand/30 mb-3">
              {me ? me.username.slice(0, 2).toUpperCase() : "··"}
            </span>
            <p className="font-bold text-white text-lg">{me?.username ?? "…"}</p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-brand/10 text-brand-soft border-brand/30 capitalize">
              {(me?.role ?? "client") + " account"}
            </span>
          </div>
          <div className="relative">
            <InfoRow label="Username" value={me?.username ?? "…"} />
            <InfoRow label="Wallet balance" value={<span className="text-emerald-400 tabular-nums">{me ? `PKR ${Number(me.balance).toFixed(2)}` : "…"}</span>} />
            <InfoRow label="Role" value={<span className="capitalize">{me?.role ?? "…"}</span>} />
            {me?.createdAt && <InfoRow label="Member since" value={new Date(me.createdAt).toLocaleDateString()} />}
          </div>
        </div>

        {/* ── Password card ── */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-surface/90 shadow-xl p-6">
          <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-sm">🔐</span>
            Change Password
          </h3>
          <p className="text-xs text-muted mb-5">Use a long, unique password you don&rsquo;t use anywhere else.</p>

          {message && (
            <div className={`rounded-xl p-4 mb-5 border ${isError ? "bg-red-500/10 border-red-500/25" : "bg-emerald-500/10 border-emerald-500/25"}`}>
              <p className={`text-sm font-semibold ${isError ? "text-red-300" : "text-emerald-300"}`}>
                {isError ? "⚠ " : "✓ "}{message}
              </p>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="cur-pw" className="label">Current password</label>
              <input
                id="cur-pw"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-pw" className="label">New password</label>
                <input
                  id="new-pw"
                  type={showPasswords ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label htmlFor="conf-pw" className="label">Confirm new password</label>
                <input
                  id="conf-pw"
                  type={showPasswords ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand"
                />
                Show passwords
              </label>
              <button type="submit" disabled={saving} className="btn-primary btn-shine">
                {saving ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ClientLayout>
  );
}
