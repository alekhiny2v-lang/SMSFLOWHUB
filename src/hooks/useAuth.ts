"use client";

import { useEffect, useState, useCallback } from "react";
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

  const checkAuth = useCallback(async () => {
    try {
      const u = await apiFetch<User>("/api/auth/me");
      setUser(u);
      if (requiredRole && u.role !== requiredRole) {
        router.replace(u.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
      }
    } catch (err) {
      const status = (err as { status?: number }).status;
      setUser(null);
      if (status === 401 && pathname !== "/login") {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, requiredRole, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
