"use client";

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { TableCard } from "@/components/TableCard";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Activation {
  id: number;
  username: string;
  countryName: string;
  service: string;
  phoneNumber: string;
  salePrice: string;
  status: string;
  smsCode: string;
  createdAt: string;
}

export default function AdminHistory() {
  const [activations, setActivations] = useState<Activation[]>([]);
  const load = () => apiFetch<Activation[]>("/api/admin/activations").then(setActivations);

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Activation History</h1>
        <p className="text-slate-400 text-sm mt-1">Complete log of all number purchases</p>
      </div>
      <TableCard>
        <table className="w-full text-left text-sm min-w-[800px]">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Country</th>
              <th className="px-5 py-4">Phone</th>
              <th className="px-5 py-4">Price</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {activations.map((a) => (
              <tr key={a.id} className="border-t border-white/5 hover:bg-white/5 transition">
                <td className="px-5 py-4">{a.id}</td>
                <td className="px-5 py-4 font-medium text-white">{a.username}</td>
                <td className="px-5 py-4">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{getCountryFlagByName(a.countryName)}</span>
                    <span>{a.countryName || "-"}</span>
                  </span>
                </td>
                <td className="px-5 py-4">{a.phoneNumber || "-"}</td>
                <td className="px-5 py-4">PKR {Number(a.salePrice).toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(a.status)}`}>{a.status}</span>
                </td>
                <td className="px-5 py-4 font-mono">{a.smsCode || "-"}</td>
                <td className="px-5 py-4">{new Date(a.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </AdminLayout>
  );
}

function getStatusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === "pending") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  if (status === "cancelled") return "bg-red-500/10 text-red-400 border border-red-500/20";
  return "bg-slate-500/10 text-slate-400";
}
