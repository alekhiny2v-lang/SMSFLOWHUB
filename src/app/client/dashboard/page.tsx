"use client";

import { useEffect, useState } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { TableCard } from "@/components/TableCard";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Activation {
  id: number;
  countryName: string;
  phoneNumber: string;
  status: string;
  createdAt: string;
}

export default function ClientDashboard() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const load = () => apiFetch<Activation[]>("/api/client/activations").then(setActivations);

  useEffect(() => {
    load();
  }, []);

  return (
    <ClientLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Welcome back to SMSFlow</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 mb-6">
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Recent Activations</p>
          <p className="text-3xl lg:text-4xl font-bold text-white mt-2">{activations.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-white/10 rounded-2xl p-5">
          <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Pending</p>
          <p className="text-3xl lg:text-4xl font-bold text-white mt-2">{activations.filter((a) => a.status === "pending").length}</p>
        </div>
      </div>

      <TableCard>
        <table className="w-full text-left text-sm min-w-[500px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">Country</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {activations.slice(0, 10).map((a) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{getCountryFlagByName(a.countryName)}</span>
                    <span className="font-medium text-white">{a.countryName || "-"}</span>
                  </span>
                </td>
                <td className="px-5 py-4 font-mono">{a.phoneNumber || "-"}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(a.status)}`}>{a.status}</span>
                </td>
                <td className="px-5 py-4">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </ClientLayout>
  );
}

function getStatusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === "pending") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  if (status === "cancelled") return "bg-red-500/10 text-red-400 border border-red-500/20";
  return "bg-slate-500/10 text-slate-400";
}
