"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FacebookLogo } from "@/components/FacebookLogo";
import { AlertIcon, BoltIcon, LockIcon, ShieldCheckIcon, TagIcon, UserIcon } from "@/components/AuthIcons";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await apiFetch<{ role: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-canvas flex items-center justify-center p-4">
      {/* Aurora background */}
      <div className="blob w-[38rem] h-[38rem] bg-brand/25 -top-40 -left-40" aria-hidden="true" />
      <div className="blob w-[30rem] h-[30rem] bg-brand-deep/15 -bottom-32 -right-24" style={{ animationDelay: "-7s" }} aria-hidden="true" />
      <div className="blob w-[22rem] h-[22rem] bg-white/[0.04] top-1/3 right-1/4" style={{ animationDelay: "-13s" }} aria-hidden="true" />

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-brand/10 bg-surface/85">
        {/* ── Brand panel ── */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-brand/20 via-surface/40 to-surface/10 border-r border-white/10 overflow-hidden">
          <div className="absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />

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
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft">Facebook numbers · live stock</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Facebook OTP codes,
              <br />
              <span className="bg-gradient-to-r from-brand-soft to-white bg-clip-text text-transparent">delivered in seconds.</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {[
                { Icon: BoltIcon, text: "Instant virtual numbers from 100+ countries" },
                { Icon: TagIcon, text: "Transparent PKR pricing, no hidden charges" },
                { Icon: ShieldCheckIcon, text: "No code? Automatic full refund" },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-fg-soft">
                  <span className="grid place-items-center w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-brand-soft shrink-0">
                    <Icon size={14} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 text-[11px] text-muted">
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
            Live stock synced automatically
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="relative p-7 sm:p-10">
          <div className="mb-8 text-center lg:text-left">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-lg shadow-brand/25 border border-white/10 lg:hidden">
              <Image src="/logo.png" alt="SMSFlow" width={64} height={64} className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-muted text-sm mt-2">Sign in to your SMSFlow account</p>
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
                  placeholder="Enter username"
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
                  className="input pl-10 pr-11"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg-soft text-xs font-bold px-1.5 py-0.5 rounded transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-muted text-sm mt-6">
            Don&rsquo;t have an account?{" "}
            <Link href="/signup" className="text-brand-soft hover:text-white font-semibold transition">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
