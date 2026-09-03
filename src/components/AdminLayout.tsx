"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar, MobileHeader } from "./Sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth({ requiredRole: "admin" });
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-b-[#1877F2]" />
          <div className="absolute inset-0 rounded-full blur-xl bg-[#1877F2]/25" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 animate-pulse">Loading console…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="page-bg" aria-hidden="true" />
      <MobileHeader onMenuClick={() => setMenuOpen(true)} title="Admin Portal" />
      <Sidebar
        role="admin"
        username={user.username}
        onLogout={logout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <main className="flex-1 p-4 lg:p-8 overflow-x-clip">
        <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
