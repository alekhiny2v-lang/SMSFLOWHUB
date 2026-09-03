"use client";

import { useEffect, useMemo, useState, useCallback, useRef, memo } from "react";
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

// Must match TIMEOUT_MINUTES on the server (api/client/activations routes)
const TIMEOUT_MS = 20 * 60 * 1000;

function formatTime(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function playOtpSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playNote = (freq: number, start: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(gainVal * 0.01, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    // Pleasant chime: C5 -> E5 -> G5 ascending
    playNote(523, 0, 0.25, 0.15);
    playNote(659, 0.12, 0.25, 0.15);
    playNote(784, 0.22, 0.35, 0.15);
  } catch {
    // ignore audio errors
  }
}

function getStatusColor(status: string) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (status === "pending") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
  if (status === "cancelled") return "bg-red-500/10 text-red-400 border border-red-500/20";
  return "bg-slate-500/10 text-slate-400";
}

/**
 * The countdown now lives in its own tiny component with its own 1s timer,
 * so only this small badge re-renders every second — not the whole page.
 */
const TimeoutBadge = memo(function TimeoutBadge({ createdAt, active }: { createdAt: string; active: boolean }) {
  const deadline = useMemo(() => new Date(createdAt).getTime() + TIMEOUT_MS, [createdAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;
  const remaining = Math.max(0, deadline - now);
  if (remaining <= 0) return null;

  return (
    <span className="text-xs text-slate-400 bg-slate-950/50 px-2 py-1 rounded-lg">Timeout: {formatTime(remaining)}</span>
  );
});

const ActivationCard = memo(function ActivationCard({
  activation: a,
  isProcessing,
  copiedNumber,
  copiedOtp,
  onAction,
  onCopyNumber,
  onCopyOtp,
}: {
  activation: Activation;
  isProcessing: boolean;
  copiedNumber: boolean;
  copiedOtp: boolean;
  onAction: (id: number, action: string) => void;
  onCopyNumber: (text: string, id: number) => void;
  onCopyOtp: (text: string | null, id: number) => void;
}) {
  return (
    <div
      className={`bg-slate-900 border rounded-2xl shadow-xl p-5 card-hover ${
        a.smsCode ? "border-emerald-500/30" : a.status === "cancelled" ? "border-red-500/30" : "border-blue-500/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getCountryFlagByName(a.countryName)}</span>
          <div>
            <p className="font-bold text-white text-lg">{a.countryName || "Unknown"}</p>
            <p className="text-slate-400 text-sm font-mono flex items-center gap-2">
              {a.phoneNumber || "-"}
              {a.phoneNumber && (
                <button
                  onClick={() => onCopyNumber(a.phoneNumber || "", a.id)}
                  className="ml-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md transition"
                  title="Copy number"
                >
                  {copiedNumber ? "Copied!" : "Copy"}
                </button>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(a.status)}`}>
            {a.status}
          </span>
        </div>
      </div>

      <div className="bg-slate-950/50 rounded-xl p-5 mb-4 text-center border border-white/5">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest">OTP / SMS Code</p>
        {a.smsCode ? (
          <div className="flex items-center justify-center gap-3">
            <p className="text-4xl lg:text-5xl font-bold text-emerald-400 font-mono tracking-wider">{a.smsCode}</p>
            <button
              onClick={() => onCopyOtp(a.smsCode, a.id)}
              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition font-bold"
              title="Copy OTP"
            >
              {copiedOtp ? "Copied!" : "Copy OTP"}
            </button>
          </div>
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
          <TimeoutBadge createdAt={a.createdAt} active={a.canCancel && a.timeRemainingMs > 0} />
        </div>

        <div className="flex gap-2">
          {a.canCancel && a.timeRemainingMs > 0 && (
            <button
              onClick={() => onAction(a.id, "cancel")}
              disabled={isProcessing}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
            >
              {isProcessing ? "..." : "Cancel & Refund"}
            </button>
          )}
          {a.status === "pending" && !a.smsCode && (
            <button
              onClick={() => onAction(a.id, "retry")}
              disabled={isProcessing}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
            >
              Retry
            </button>
          )}
          {a.smsCode && a.status !== "completed" && (
            <button
              onClick={() => onAction(a.id, "complete")}
              disabled={isProcessing}
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
  );
});

const CountryCard = memo(function CountryCard({
  price: p,
  isBuying,
  onBuy,
}: {
  price: Price;
  isBuying: boolean;
  onBuy: (id: number) => void;
}) {
  return (
    <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-5 card-hover">
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
        onClick={() => onBuy(p.id)}
        disabled={isBuying || (p.count ?? 0) <= 0}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl py-3 font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm btn-shine"
      >
        {isBuying ? "Buying..." : (p.count ?? 0) <= 0 ? "Out of Stock" : "Buy Facebook Number"}
      </button>
    </div>
  );
});

export default function BuyNumber() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activations, setActivations] = useState<Activation[]>([]);
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const activationsRef = useRef(activations);

  const [copiedNumberId, setCopiedNumberId] = useState<number | null>(null);
  const [copiedOtpId, setCopiedOtpId] = useState<number | null>(null);
  const playedSoundIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    activationsRef.current = activations;
  }, [activations]);

  const loadActivations = useCallback(() => {
    apiFetch<Activation[]>("/api/client/activations")
      .then((rows) => setActivations(rows.filter((a) => a.status === "pending" || a.status === "completed")))
      .catch(() => {});
  }, []);

  // `loading` starts as true, so the first render shows the spinner.
  // Background refreshes (quiet) never touch the spinner or the error
  // banner, so the visible grid is never replaced by a flicker.
  useEffect(() => {
    let cancelled = false;
    const refreshPrices = (quiet: boolean) => {
      apiFetch<Price[]>("/api/client/prices?service=fb")
        .then((rows) => {
          if (cancelled) return;
          setPrices(rows);
          if (!quiet) setError("");
        })
        .catch((e) => {
          if (!cancelled && !quiet) setError((e as Error).message);
        })
        .finally(() => {
          if (!cancelled && !quiet) setLoading(false);
        });
    };
    refreshPrices(false);
    loadActivations();
    const priceInterval = setInterval(() => refreshPrices(true), 30000);
    return () => {
      cancelled = true;
      clearInterval(priceInterval);
    };
  }, [loadActivations]);

  const pollActivation = useCallback(async (id: number) => {
    try {
      const updated = await apiFetch<Activation>(`/api/client/activations/${id}`);
      setActivations((prev) =>
        prev.map((a) => (a.id === id ? { ...updated, timeRemainingMs: updated.canCancel ? updated.timeRemainingMs : 0 } : a))
      );
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Pause polling when the tab is hidden so a background tab doesn't
      // burn CPU and network.
      if (typeof document !== "undefined" && document.hidden) return;
      const pendingIds = activationsRef.current.filter((a) => a.status === "pending").map((a) => a.id);
      pendingIds.forEach((id) => pollActivation(id));
    }, 5000);
    return () => clearInterval(interval);
  }, [pollActivation]);

  // Sound effect when new OTP arrives
  useEffect(() => {
    activations.forEach((a) => {
      if (a.smsCode && a.smsCode.trim() !== "" && !playedSoundIds.current.has(a.id)) {
        playedSoundIds.current.add(a.id);
        playOtpSound();
      }
    });
  }, [activations]);

  const buy = useCallback(
    async (countryId: number) => {
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
    },
    [loadActivations]
  );

  const copyNumber = useCallback(async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNumberId(id);
      setTimeout(() => setCopiedNumberId(null), 1500);
    } catch {
      // ignore
    }
  }, []);

  const copyOtp = useCallback(async (text: string | null, id: number) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOtpId(id);
      setTimeout(() => setCopiedOtpId(null), 1500);
    } catch {
      // ignore
    }
  }, []);

  const activationAction = useCallback(
    async (id: number, action: string) => {
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
    },
    [pollActivation]
  );

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
              <ActivationCard
                key={a.id}
                activation={a}
                isProcessing={processing.has(a.id)}
                copiedNumber={copiedNumberId === a.id}
                copiedOtp={copiedOtpId === a.id}
                onAction={activationAction}
                onCopyNumber={copyNumber}
                onCopyOtp={copyOtp}
              />
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
              <CountryCard key={p.id} price={p} isBuying={buying === p.id} onBuy={buy} />
            ))}
          </div>
        )}
      </section>
    </ClientLayout>
  );
}
