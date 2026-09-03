"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FacebookLogo } from "./FacebookLogo";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** Renders an official brand mark instead of the emoji icon. */
  brand?: "facebook";
}

interface SidebarProps {
  role: "admin" | "client";
  username: string;
  balance?: string;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Countries", href: "/admin/countries", icon: "🌍" },
  { label: "Deposit Accounts", href: "/admin/deposit-accounts", icon: "🏦" },
  { label: "Deposits", href: "/admin/deposits", icon: "💰" },
  { label: "History", href: "/admin/history", icon: "📜" },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: "📊" },
  { label: "Buy FB Number", href: "/client/buy", icon: "🛒", brand: "facebook" },
  { label: "History", href: "/client/history", icon: "📜" },
  { label: "Deposits", href: "/client/deposits", icon: "💰" },
  { label: "Profile", href: "/client/profile", icon: "⚙️" },
];

export function Sidebar({ role, username, balance, onLogout, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const nav = role === "admin" ? adminNav : clientNav;
  const isClient = role === "client";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50
          w-72 h-screen flex flex-col
          bg-slate-950/95 lg:bg-slate-950/60 backdrop-blur-xl
          border-r border-white/10
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand glow behind the top of the sidebar */}
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-[#1877F2]/15 blur-3xl pointer-events-none" aria-hidden="true" />

        {/* Logo */}
        <div className="relative p-5 border-b border-white/10 flex items-center justify-between">
          <Link href={role === "admin" ? "/admin/dashboard" : "/client/dashboard"} className="flex items-center gap-3 min-w-0 group">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-[#1877F2]/25 border border-white/10 shrink-0 transition-transform group-hover:scale-105">
              <Image src="/logo.png" alt="SMSFlow" width={44} height={44} className="w-full h-full object-cover" priority />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">SMSFlow</h2>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8ab9f9] font-bold leading-tight">
                {role === "admin" ? "Admin Console" : "Client Portal"}
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden grid place-items-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-600 font-bold">Menu</p>
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm group ${
                  active
                    ? "bg-gradient-to-r from-[#1877F2]/25 to-[#1877F2]/5 text-white shadow-lg shadow-[#1877F2]/15"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                {/* Active accent bar */}
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#1877F2] transition-opacity ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                  aria-hidden="true"
                />
                {item.brand === "facebook" ? (
                  <FacebookLogo size={20} accessible={false} className="shrink-0" />
                ) : (
                  <span className="text-lg leading-none shrink-0">{item.icon}</span>
                )}
                <span className="font-semibold">{item.label}</span>
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#8ab9f9]" />}
              </Link>
            );
          })}

          {isClient && (
            <div className="pt-4 px-1">
              <div className="rounded-2xl border border-[#1877F2]/25 bg-gradient-to-br from-[#1877F2]/15 via-slate-900/60 to-slate-900/30 p-4 relative overflow-hidden">
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#1877F2]/25 blur-2xl" aria-hidden="true" />
                <p className="relative text-[10px] uppercase tracking-widest text-slate-400 font-bold">Wallet balance</p>
                <p className="relative text-xl font-bold text-emerald-400 tabular-nums mt-1">
                  {balance !== undefined ? `PKR ${Number(balance).toFixed(2)}` : "—"}
                </p>
                <Link
                  href="/client/deposits"
                  onClick={onClose}
                  className="relative mt-3 flex items-center justify-center gap-1.5 w-full fb-gradient text-white rounded-xl py-2 text-xs font-bold shadow-lg shadow-[#1877F2]/25 transition hover:brightness-110 active:scale-[0.98] btn-shine"
                >
                  + Add Funds
                </Link>
              </div>
            </div>
          )}
        </nav>

        {/* Footer / account */}
        <div className="relative p-3 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 p-3 mb-2">
            <span className="grid place-items-center w-10 h-10 rounded-xl fb-gradient text-white font-bold text-sm shrink-0 shadow-lg shadow-[#1877F2]/25">
              {username.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-tight">Logged in as</p>
              <p className="font-bold text-white text-sm truncate leading-tight mt-0.5">{username}</p>
              {!isClient && balance !== undefined && (
                <p className="text-emerald-400 text-xs font-bold tabular-nums">PKR {Number(balance).toFixed(2)}</p>
              )}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-2.5 text-sm font-bold transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({
  onMenuClick,
  title,
  balance,
}: {
  onMenuClick: () => void;
  title: string;
  balance?: string;
}) {
  return (
    <header className="lg:hidden h-16 shrink-0 px-4 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="grid place-items-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white text-base"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-sm text-white leading-tight truncate">{title}</h1>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8ab9f9] font-bold leading-tight">SMSFlow</p>
        </div>
      </div>
      {balance !== undefined && (
        <span className="shrink-0 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-full px-3 py-1.5 tabular-nums">
          PKR {Number(balance).toFixed(2)}
        </span>
      )}
    </header>
  );
}
