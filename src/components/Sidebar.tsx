"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
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
  { label: "Buy Number", href: "/client/buy", icon: "🛒" },
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
          w-72 bg-slate-900/95 backdrop-blur-xl text-white h-screen flex flex-col
          border-r border-white/10
          transform transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden shadow-lg">
              <Image src="/logo.png" alt="SMSFlow" width={44} height={44} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SMSFlow</h2>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white text-xl p-1">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="glass rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-400">Logged in as</p>
            <p className="font-semibold text-white">{username}</p>
            {balance !== undefined && (
              <p className="text-emerald-400 font-bold mt-1">PKR {Number(balance).toFixed(2)}</p>
            )}
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl py-2.5 text-sm font-semibold transition"
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
    <header className="lg:hidden bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex items-center justify-between sticky top-0 z-30">
      <button onClick={onMenuClick} className="text-2xl text-white p-1" aria-label="Open menu">
        ☰
      </button>
      <div className="text-center">
        <h1 className="font-bold text-sm text-white">{title}</h1>
        {balance !== undefined && (
          <p className="text-emerald-400 text-xs font-bold">PKR {Number(balance).toFixed(2)}</p>
        )}
      </div>
      <div className="w-8" />
    </header>
  );
}
