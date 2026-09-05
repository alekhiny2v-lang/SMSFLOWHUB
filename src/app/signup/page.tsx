"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FacebookLogo } from "@/components/FacebookLogo";
import { AlertIcon, LockIcon, UserIcon } from "@/components/AuthIcons";
import { apiFetch } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      router.replace("/client/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-canvas flex items-center justify-center p-4">
      {/* Aurora background */}
      <div className="blob w-[38rem] h-[38rem] bg-brand/25 -top-40 -right-40" aria-hidden="true" />
      <div className="blob w-[30rem] h-[30rem] bg-brand-deep/15 -bottom-32 -left-24" style={{ animationDelay: "-8s" }} aria-hidden="true" />
      <div className="blob w-[22rem] h-[22rem] bg-white/[0.04] top-1/4 left-1/3" style={{ animationDelay: "-14s" }} aria-hidden="true" />

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-brand/10 bg-surface/85">
        {/* ── Brand panel ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand/20 via-surface/40 to-surface/10 border-r border-white/10 overflow-hidden">
          <div className="absolute -left-16 -top-20 h-72 w-72 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />

          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-brand/30">
              <Image src="/logo.png" alt="SMSFlow" width={44} height={44} className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-white text-lg leading-tight">SMSFlow</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-brand-soft font-bold">Verification Panel</p>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2.5 mb-5">
              <FacebookLogo size={30} accessible={false} className="rounded-[8px] brand-badge-bloom" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft">Join in under a minute</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Start verifying with
              <br />
              <span className="bg-gradient-to-r from-brand-soft to-white bg-clip-text text-transparent">virtual numbers today.</span>
            </h2>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { v: "100+", l: "Countries" },
                { v: "24/7", l: "Live stock" },
                { v: "0 PKR", l: "To join" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-lg font-bold text-white">{s.v}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-center gap-2 text-[11px] text-muted">
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
            Refund guaranteed when no code arrives
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="relative p-7 sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-lg shadow-brand/25 border border-white/10 lg:hidden">
              <Image src="/logo.png" alt="SMSFlow" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Create your account</h1>
            <p className="text-muted text-sm mt-2">Join SMSFlow — it takes less than a minute</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="label">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Choose a username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Create password"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="label">Confirm password</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10 pr-11"
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg-soft text-xs font-bold px-1.5 py-0.5 rounded transition"
                  aria-label={showPassword ? "Hide passwords" : "Show passwords"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex items-start gap-2.5">
                <AlertIcon className="text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full brand-gradient text-ink rounded-xl py-3.5 font-bold shadow-lg shadow-brand/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 btn-shine flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70" />
                  Creating account…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-soft hover:text-white font-semibold transition">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
