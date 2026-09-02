"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ClientLayout } from "@/components/ClientLayout";
import { apiFetch } from "@/lib/api";
import { getCountryFlagByName } from "@/lib/country";

interface Price {
  id: number;
  name: string;
  code: string;
  pkrPrice: number;
  count: number | null;
  isCustomRate?: boolean;
  isFixedRate?: boolean;
}

interface Activation {
  id: number;
  countryName: string;
  countryCode: string;
  phoneNumber: string;
  cost: string;
  status: string;
  smsCode: string | null;
  canCancel: boolean;
  timeRemainingMs: number;
  createdAt: string;
}

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function BuyNumber() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activations, setActivations] = useState<Activation[]>([]);
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const activationsRef = useRef(activations);

  useEffect(() => {
    activationsRef.current = activations;
  }, [activations]);

  const loadPrices = useCallback(() => {
    setLoading(true);
    apiFetch<Price[]>("/api/client/prices?service=fb")
      .then(setPrices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadActivations = useCallback(() => {
    apiFetch<Activation[]>("/api/client/activations")
      .then((rows) => setActivations(rows.filter((a) => a.status === "pending" || a.status === "completed")))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadPrices();
    loadActivations();
    const priceInterval = setInterval(loadPrices, 30000);
    return () => clearInterval(priceInterval);
  }, [loadPrices, loadActivations]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setActivations((prev) =>
        prev.map((a) => {
          if (!a.canCancel || a.timeRemainingMs <= 0) return a;
          const remaining = a.timeRemainingMs - 1000;
          return { ...a, timeRemainingMs: Math.max(0, remaining) };
        })
      );
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const pollActivation = async (id: number) => {
    try {
      const updated = await apiFetch<Activation>(`/api/client/activations/${id}`);
      setActivations((prev) =>
        prev.map((a) => (a.id === id ? { ...updated, timeRemainingMs: updated.canCancel ? updated.timeRemainingMs : 0 } : a))
      );
    } catch {
      // ignore polling errors
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const pendingIds = activationsRef.current.filter((a) => a.status === "pending").map((a) => a.id);
      pendingIds.forEach((id) => pollActivation(id));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const buy = async (countryId: number) => {
    setBuying(countryId);
    setError("");
    try {
      await apiFetch<{ activationId: string; phoneNumber: string; cost: number; country: string }>("/api/client/buy", {
        method: "POST",
        body: JSON.stringify({ countryId }),
      });
      loadActivations();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuying(null);
    }
  };

  const activationAction = async (id: number, action: string) => {
    setProcessing((prev) => new Set(prev).add(id));
    setError("");
    try {
      await apiFetch(`/api/client/activations/${id}`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      await pollActivation(id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <ClientLayout>
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Buy Facebook Number</h1>
        <p className="text-slate-400 text-sm mt-1">Purchase virtual numbers for Facebook OTP verification via SMSFlow</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-5">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Active Numbers Section */}
      {activations.length > 0 && (
        <section className="mb-8 lg:mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🛡️</span> My Active Numbers
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activations.map((a) => (
              <div
                key={a.id}
                className={`bg-slate-900/60 backdrop-blur-sm border rounded-2xl shadow-xl p-5 card-hover ${
                  a.smsCode ? "border-emerald-500/30" : a.status === "cancelled" ? "border-red-500/30" : "border-blue-500/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getCountryFlagByName(a.countryName)}</span>
                    <div>
                      <p className="font-bold text-white text-lg">{a.countryName || "Unknown"}</p>
                      <p className="text-slate-400 text-sm font-mono">{a.phoneNumber || "-"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/50 rounded-xl p-5 mb-4 text-center border border-white/5">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">OTP / SMS Code</p>
                  {a.smsCode ? (
                    <p className="text-4xl lg:text-5xl font-bold text-emerald-400 font-mono tracking-wider">{a.smsCode}</p>
                  ) : a.status === "cancelled" ? (
                    <p className="text-xl font-bold text-red-400">Cancelled</p>
                  ) : (
                    <div>
                      <p className="text-slate-500 text-sm italic">Waiting for OTP...</p>
                      <div className="mt-3 flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                      <span className="text-sm">📘</span> Facebook
                    </span>
                    {a.canCancel && a.timeRemainingMs > 0 && (
                      <span className="text-xs text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg">
                        Timeout: {formatTime(a.timeRemainingMs)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {a.canCancel && a.timeRemainingMs > 0 && (
                      <button
                        onClick={() => activationAction(a.id, "cancel")}
                        disabled={processing.has(a.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
                      >
                        {processing.has(a.id) ? "..." : "Cancel & Refund"}
                      </button>
                    )}
                    {a.status === "pending" && !a.smsCode && (
                      <button
                        onClick={() => activationAction(a.id, "retry")}
                        disabled={processing.has(a.id)}
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
                      >
                        Retry
                      </button>
                    )}
                    {a.smsCode && a.status !== "completed" && (
                      <button
                        onClick={() => activationAction(a.id, "complete")}
                        disabled={processing.has(a.id)}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>

                {a.status === "cancelled" && (
                  <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                    Amount refunded to your balance
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Countries Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🌍</span> Available Countries
        </h2>
        {loading ? (
          <div className="flex items-center gap-3 text-slate-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            Loading countries...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {prices.map((p) => (
              <div key={p.id} className="bg-slate-900/60 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl p-5 card-hover">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-4xl">{getCountryFlagByName(p.name)}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-base">{p.name}</h3>
                    <p className="text-slate-500 text-xs uppercase tracking-wide">{p.code}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Available</p>
                    <p className={`text-lg font-bold ${(p.count ?? 0) <= 0 ? "text-red-400" : p.isCustomRate ? "text-blue-400" : p.isFixedRate ? "text-purple-400" : "text-emerald-400"}`}>
                      {(p.count ?? 0) <= 0 ? "Out of Stock" : p.count}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">PKR {p.pkrPrice.toFixed(2)}</p>
                    <p className="text-xs text-slate-500">
                      {p.isCustomRate ? "your custom rate" : p.isFixedRate ? "fixed rate" : "per number"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => buy(p.id)}
                  disabled={buying === p.id || (p.count ?? 0) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm btn-shine"
                >
                  {buying === p.id ? "Buying..." : (p.count ?? 0) <= 0 ? "Out of Stock" : "Buy Facebook Number"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </ClientLayout>
  );
}

function getStatusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === "pending") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  if (status === "cancelled") return "bg-red-500/10 text-red-400 border border-red-500/20";
  return "bg-slate-500/10 text-slate-400";
}
