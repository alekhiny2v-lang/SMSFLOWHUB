"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface User {
  id: number;
  username: string;
  role: "admin" | "client";
  balance: string;
}

export function useAuth({ requiredRole }: { requiredRole?: "admin" | "client" } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the latest pathname in a ref so the auth check does NOT re-run on
  // every navigation (that caused a /api/auth/me request + full re-render
  // on each page change, making the panel feel laggy).
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Auth is checked once on mount only (previously it re-ran on every
  // navigation, adding a request + full re-render to each page change).
  useEffect(() => {
    let cancelled = false;
    apiFetch<User>("/api/auth/me")
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        if (requiredRole && u.role !== requiredRole) {
          router.replace(u.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { status?: number }).status;
        setUser(null);
        if (status === 401 && pathnameRef.current !== "/login") {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requiredRole, router]);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return { user, loading, logout, setUser };
}
