"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar, MobileHeader } from "./Sidebar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth({ requiredRole: "client" });
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <MobileHeader onMenuClick={() => setMenuOpen(true)} title="Client Portal" balance={user.balance} />
      <Sidebar
        role="client"
        username={user.username}
        balance={user.balance}
        onLogout={logout}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      {/* overflow-x-clip (not -hidden) keeps the document as the scroll
          container, so `position: sticky` panels inside the page — e.g. the
          pinned Buy box on /client/buy — actually stick. An overflow value of
          `hidden` would turn <main> into its own scrollport and silently break
          every sticky child. */}
      <main className="flex-1 p-4 lg:p-8 overflow-x-clip">
        <div className="max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
