"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch } from "@/lib/api";

interface DashboardData {
  users: { count: number; totalBalance: string };
  transactions: { total: string };
  activations: { count: number; pending: number; completed: number; cancelled: number };
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [balance, setBalance] = useState<{ raw: string; balance: number } | null>(null);

  useEffect(() => {
    apiFetch<DashboardData>("/api/admin/dashboard").then(setData);
    apiFetch<{ raw: string; balance: number }>("/api/admin/smsbower/balance").then(setBalance);
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your SMS panel performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        <StatCard title="Total Users" value={data?.users?.count ?? "-"} icon="👥" gradient="from-blue-500 to-cyan-500" />
        <StatCard title="Total Balance (PKR)" value={data ? Number(data.users.totalBalance).toFixed(2) : "-"} icon="💰" gradient="from-emerald-500 to-teal-500" />
        <StatCard title="Total Deposits (PKR)" value={data ? Number(data.transactions.total).toFixed(2) : "-"} icon="📈" gradient="from-purple-500 to-pink-500" />
        <StatCard title="SMSBOWER Balance" value={balance ? `$${balance.balance.toFixed(2)}` : "-"} icon="🌐" gradient="from-orange-500 to-red-500" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 mt-4 lg:mt-5">
        <StatCard title="Total Activations" value={data?.activations?.count ?? "-"} icon="📱" gradient="from-slate-600 to-slate-500" />
        <StatCard title="Pending" value={data?.activations?.pending ?? "-"} icon="⏳" gradient="from-yellow-500 to-amber-500" />
        <StatCard title="Completed" value={data?.activations?.completed ?? "-"} icon="✅" gradient="from-green-500 to-emerald-500" />
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, gradient }: { title: string; value: React.ReactNode; icon: string; gradient: string }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 card-hover">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">{title}</p>
      <p className="text-2xl lg:text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}
