"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import Link from "next/link";
import { ClientLayout } from "@/components/ClientLayout";
import { FacebookChip, FacebookLogo } from "@/components/FacebookLogo";
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
  /** PKR charged. The per-id poll endpoint returns the USD cost in `cost`,
      so `salePrice` is preferred whenever the server sends it. */
  salePrice?: string;
  status: string;
  smsCode: string | null;
  canCancel: boolean;
  timeRemainingMs: number;
  createdAt: string;
}

// Must match TIMEOUT_MINUTES on the server (api/client/activations routes)
const TIMEOUT_MS = 20 * 60 * 1000;
const SOUND_KEY = "smsflow:buy:otp-sound";
const PIN_KEY = "smsflow:buy:pinned";

type SortKey = "price" | "stock" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  price: "Cheapest first",
  stock: "Most in stock",
  name: "Country A → Z",
};

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPkr(value: number) {
  return `PKR ${value.toFixed(2)}`;
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

function getStatusMeta(status: string, hasCode: boolean) {
  if (hasCode || status === "completed")
    return {
      label: "Code received",
      pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25",
      ring: "border-emerald-500/40",
    };
  if (status === "pending")
    return { label: "Waiting for SMS", pill: "bg-amber-500/10 text-amber-300 border border-amber-500/25", ring: "border-[#1877F2]/40" };
  if (status === "cancelled")
    return { label: "Cancelled", pill: "bg-red-500/10 text-red-400 border border-red-500/25", ring: "border-red-500/35" };
  return { label: status, pill: "bg-slate-500/10 text-slate-400 border border-white/10", ring: "border-white/10" };
}

/**
 * Countdown + progress rail, kept in its own tiny component with its own 1s
 * timer, so only this strip re-renders every second — not the whole page.
 */
const TimeoutBar = memo(function TimeoutBar({ createdAt }: { createdAt: string }) {
  const deadline = useMemo(() => new Date(createdAt).getTime() + TIMEOUT_MS, [createdAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, deadline - now);
  if (remaining <= 0) return null;

  const leftPercent = Math.min(100, Math.max(0, (remaining / TIMEOUT_MS) * 100));
  const urgent = remaining < 3 * 60 * 1000;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-500">Free-cancel window</span>
        <span className={`font-mono font-bold tabular-nums ${urgent ? "text-red-400" : "text-slate-300"}`}>
          {urgent ? "Expiring " : "Timeout "}
          {formatCountdown(remaining)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? "bg-red-500" : "bg-[#1877F2]"}`}
          style={{ width: `${leftPercent}%` }}
        />
      </div>
    </div>
  );
});

/** "updated Ns ago" — same trick: one 1s timer for a 1-line label. */
const SyncLabel = memo(function SyncLabel({ updatedAt, loading }: { updatedAt: number | null; loading: boolean }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <>Syncing live stock…</>;
  if (!updatedAt) return <>Live stock</>;
  const age = Math.max(0, Math.round((now - updatedAt) / 1000));
  if (age < 5) return <>Live stock · synced now</>;
  if (age < 60) return <>Live stock · updated {age}s ago</>;
  return <>Live stock · updated {Math.floor(age / 60)}m ago</>;
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
  const hasCode = Boolean(a.smsCode && a.smsCode.trim() !== "");
  const meta = getStatusMeta(a.status, hasCode);

  return (
    <div className={`bg-slate-900/90 border ${meta.ring} rounded-2xl shadow-xl p-5 pl-6 card-hover relative overflow-hidden`}>
      {/* Facebook service strip */}
      <div className="absolute inset-y-0 left-0 w-1.5 fb-gradient" aria-hidden="true" />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl leading-none shrink-0">{getCountryFlagByName(a.countryName)}</span>
          <div className="min-w-0">
            <p className="font-bold text-white text-base truncate">{a.countryName || "Unknown"}</p>
            <p className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              {new Date(a.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${meta.pill}`}>{meta.label}</span>
      </div>

      <p className="text-slate-200 text-sm lg:text-base font-mono flex items-center gap-2 mb-3 flex-wrap">
        <span>{a.phoneNumber || "-"}</span>
        {a.phoneNumber && (
          <button
            onClick={() => onCopyNumber(a.phoneNumber || "", a.id)}
            className="text-[11px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 px-2 py-0.5 rounded-md transition font-semibold"
            title="Copy the phone number to paste into Facebook"
          >
            {copiedNumber ? "✓ Copied" : "Copy number"}
          </button>
        )}
      </p>

      <div className="bg-slate-950/60 rounded-xl p-4 text-center border border-white/5">
        <p className="text-[11px] text-slate-500 mb-2 uppercase tracking-widest font-semibold">Facebook OTP / SMS code</p>
        {hasCode ? (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <p className="text-4xl lg:text-5xl font-bold text-emerald-400 font-mono tracking-[0.18em] tabular-nums">{a.smsCode}</p>
            <button
              onClick={() => onCopyOtp(a.smsCode, a.id)}
              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 px-3 py-1.5 rounded-lg transition font-bold"
              title="Copy the OTP code"
            >
              {copiedOtp ? "✓ Copied" : "Copy OTP"}
            </button>
          </div>
        ) : a.status === "cancelled" ? (
          <p className="text-lg font-bold text-red-400">Cancelled — number released</p>
        ) : (
          <div>
            <p className="text-slate-500 text-sm italic">Waiting for OTP…</p>
            <div className="mt-3 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1877F2]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
        <div className="flex items-center gap-2 flex-wrap">
          <FacebookChip />
          <span className="text-[11px] text-slate-400 bg-slate-950/60 border border-white/5 px-2 py-1 rounded-lg font-semibold tabular-nums">
            Charged {formatPkr(Number(a.salePrice ?? a.cost ?? 0))}
          </span>
        </div>

        <div className="flex gap-2">
          {a.canCancel && a.timeRemainingMs > 0 && (
            <button
              onClick={() => onAction(a.id, "cancel")}
              disabled={isProcessing}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
            >
              {isProcessing ? "…" : "Cancel & Refund"}
            </button>
          )}
          {a.status === "pending" && !a.smsCode && (
            <button
              onClick={() => onAction(a.id, "retry")}
              disabled={isProcessing}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/25 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
              title="Ask the provider for the code right now"
            >
              Retry
            </button>
          )}
          {a.smsCode && a.status !== "completed" && (
            <button
              onClick={() => onAction(a.id, "complete")}
              disabled={isProcessing}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-60"
            >
              Complete
            </button>
          )}
        </div>
      </div>

      {a.canCancel && a.timeRemainingMs > 0 && <TimeoutBar createdAt={a.createdAt} />}

      {a.status === "cancelled" && (
        <p className="mt-4 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          Amount refunded to your balance
        </p>
      )}
    </div>
  );
});

const CountryCard = memo(function CountryCard({
  price: p,
  isBuying,
  disabled,
  stockPercent,
  isCheapest,
  onBuy,
}: {
  price: Price;
  isBuying: boolean;
  disabled: boolean;
  stockPercent: number;
  isCheapest: boolean;
  onBuy: (id: number) => void;
}) {
  const stock = p.count ?? 0;
  const outOfStock = stock <= 0;

  return (
    <div
      className={`bg-slate-900/90 border rounded-2xl shadow-xl p-5 card-hover flex flex-col ${
        outOfStock ? "border-white/5 opacity-75" : "border-white/10 hover:border-[#1877F2]/45"
      }`}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl leading-none mt-0.5 shrink-0">{getCountryFlagByName(p.name)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base truncate">{p.name}</h3>
            {isCheapest && !outOfStock && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                Best value
              </span>
            )}
          </div>
          <p className="text-slate-500 text-[11px] uppercase tracking-widest font-semibold">{p.code}</p>
        </div>
        <FacebookLogo size={26} accessible={false} className="shrink-0 rounded-[7px] shadow-lg shadow-[#1877F2]/25" />
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Price</p>
          <p className="text-2xl font-bold text-white tabular-nums">{formatPkr(p.pkrPrice)}</p>
          <p className="text-[11px] text-slate-500">{p.isCustomRate ? "your custom rate" : p.isFixedRate ? "fixed rate" : "per number"}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">In stock</p>
          <p className={`text-lg font-bold tabular-nums ${outOfStock ? "text-red-400" : p.isCustomRate ? "text-blue-300" : "text-emerald-400"}`}>
            {outOfStock ? "None" : p.count}
          </p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-4" title={`${stock} numbers available`}>
        <div
          className={`h-full rounded-full ${outOfStock ? "bg-red-500/45" : stockPercent > 35 ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${outOfStock ? 100 : Math.max(6, stockPercent)}%` }}
        />
      </div>

      <button
        onClick={() => onBuy(p.id)}
        disabled={disabled || outOfStock}
        className="mt-auto w-full fb-gradient text-white rounded-xl py-3 font-bold shadow-lg shadow-[#1877F2]/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:brightness-100 text-sm btn-shine flex items-center justify-center gap-2"
      >
        {isBuying ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70" />
            Reserving number…
          </>
        ) : outOfStock ? (
          "Out of Stock"
        ) : (
          <>
            <FacebookLogo size={15} variant="glyph" accessible={false} />
            Buy Facebook Number
          </>
        )}
      </button>
    </div>
  );
});

const SkeletonCard = ({ blocks = 2 }: { blocks?: number }) => (
  <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="skeleton h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/2 rounded" />
        <div className="skeleton h-2.5 w-1/4 rounded" />
      </div>
    </div>
    {Array.from({ length: blocks }).map((_, i) => (
      <div key={i} className="skeleton h-10 w-full rounded-xl mb-2.5" />
    ))}
    <div className="skeleton h-10 w-full rounded-xl" />
  </div>
);

/**
 * The buy box, pinned to the top of the page. Country picker, live stock, price,
 * balance and the Buy button stay on screen while you scroll through active
 * numbers and wait for OTPs. The chevron opens a searchable quick-pick list that
 * lives inside the same pinned box, so you never have to scroll to order.
 */
function PinnedBuyBox({
  total,
  selected,
  onBuy,
  buyingId,
  balance,
  loading,
  pinned,
  onTogglePin,
  expanded,
  onToggleExpanded,
  panelQuery,
  onPanelQuery,
  panelRows,
  onSelectFromPanel,
  lastUpdated,
  onRefresh,
  refreshing,
}: {
  total: number;
  selected: Price | null;
  onBuy: (id: number) => void;
  buyingId: number | null;
  balance: number | null;
  loading: boolean;
  pinned: boolean;
  onTogglePin: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  panelQuery: string;
  onPanelQuery: (v: string) => void;
  panelRows: Price[];
  onSelectFromPanel: (id: number) => void;
  lastUpdated: number | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleExpanded();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, onToggleExpanded]);

  const stock = selected?.count ?? 0;
  const outOfStock = !selected || stock <= 0;
  const insufficient = Boolean(selected && balance !== null && balance < selected.pkrPrice);
  const busy = buyingId !== null;

  return (
    <div
      className={`${pinned ? "sticky top-16 lg:top-0" : "relative"} z-30 -mx-4 lg:-mx-8 px-4 lg:px-8 pt-2 pb-2.5 bg-slate-950/90 backdrop-blur-xl ${
        pinned ? "border-b border-[#1877F2]/20" : "border-b border-transparent"
      }`}
    >
      <div className="rounded-2xl border border-[#1877F2]/30 bg-slate-900/95 fb-glow">
        <div className="flex flex-wrap items-center gap-2 p-2 lg:flex-nowrap lg:gap-3 lg:p-3 lg:px-4">
          <div className="flex items-center gap-2.5 lg:gap-3 lg:pr-4 lg:border-r lg:border-white/10">
            <FacebookLogo size={30} accessible={false} className="shrink-0 rounded-[8px] fb-badge-bloom lg:hidden" />
            <FacebookLogo size={34} accessible={false} className="hidden lg:block shrink-0 rounded-[9px] fb-badge-bloom" />
            <div className="min-w-0 hidden lg:block">
              <p className="font-bold text-white text-sm leading-tight">Buy Facebook Number</p>
              <p className="text-[11px] text-slate-400 leading-tight flex items-center gap-1.5 mt-0.5">
                <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
                <SyncLabel updatedAt={lastUpdated} loading={loading} />
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2 min-w-0">
            <button
              onClick={onToggleExpanded}
              aria-expanded={expanded}
              title="Change country"
              className="flex-1 min-w-0 flex items-center gap-2 lg:gap-2.5 bg-slate-950/70 hover:bg-slate-950 border border-white/10 hover:border-[#1877F2]/45 rounded-xl px-2.5 lg:px-3 py-2 text-left transition"
            >
              <span className="text-lg lg:text-xl leading-none shrink-0">{selected ? getCountryFlagByName(selected.name) : "🌍"}</span>
              <span className="flex-1 min-w-0">
                <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-tight">Country</span>
                <span className="block text-[13px] lg:text-sm font-bold text-white truncate leading-snug">
                  {loading ? "Loading countries…" : selected ? selected.name : "No country available"}
                </span>
              </span>
              <span className="hidden sm:inline text-sm font-bold text-white tabular-nums shrink-0">
                {selected ? formatPkr(selected.pkrPrice) : ""}
              </span>
              <span className={`text-[11px] font-bold shrink-0 tabular-nums ${outOfStock ? "text-red-400" : "text-emerald-400"}`}>
                {loading ? "" : outOfStock ? "0 left" : `${stock} left`}
              </span>
              <span className={`text-slate-500 text-xs transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}>▾</span>
            </button>

            <div className="hidden sm:block shrink-0 bg-slate-950/70 border border-white/10 rounded-xl px-3 py-2 min-w-[112px]">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold leading-tight">Balance</p>
              <p className={`text-sm font-bold tabular-nums leading-snug ${insufficient ? "text-red-400" : "text-emerald-400"}`}>
                {balance === null ? "—" : formatPkr(balance)}
              </p>
            </div>

            <button
              onClick={() => selected && onBuy(selected.id)}
              disabled={busy || !selected || outOfStock}
              title={outOfStock ? "This country is out of stock — pick another" : undefined}
              className="shrink-0 flex-none w-auto lg:w-[224px] fb-gradient text-white rounded-xl px-3.5 lg:px-4 py-2 lg:py-2.5 font-bold text-xs lg:text-sm shadow-lg shadow-[#1877F2]/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:brightness-100 btn-shine flex items-center justify-center gap-1.5 lg:gap-2"
            >
              {buyingId === selected?.id ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/70" />
                  Reserving…
                </>
              ) : (
                <>
                  <FacebookLogo size={14} variant="glyph" accessible={false} />
                  <span>{outOfStock ? "Out of stock" : insufficient ? "Top up to buy" : "Buy now"}</span>
                  <span className="hidden lg:inline tabular-nums">
                    {outOfStock || insufficient ? "" : selected ? `· ${selected.pkrPrice.toFixed(2)}` : ""}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 lg:pl-3 lg:border-l lg:border-white/10 ml-auto lg:ml-0">
            <button
              onClick={onRefresh}
              title="Refresh live stock and prices"
              className="w-8 h-8 lg:w-9 lg:h-9 grid place-items-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition"
            >
              <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>⟳</span>
            </button>
            <button
              onClick={onTogglePin}
              title={pinned ? "Unpin — let the buy box scroll away with the page" : "Pin — keep the buy box at the top"}
              aria-pressed={pinned}
              className={`hidden sm:flex h-8 lg:h-9 px-2.5 lg:px-3 rounded-xl text-[11px] font-bold border items-center gap-1.5 transition ${
                pinned ? "bg-[#1877F2]/15 border-[#1877F2]/45 text-[#8ab9f9]" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              📌 <span className="hidden lg:inline">{pinned ? "Pinned" : "Pin to top"}</span>
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-white/10 p-3 lg:px-4">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
                <input
                  ref={searchRef}
                  value={panelQuery}
                  onChange={(e) => onPanelQuery(e.target.value)}
                  placeholder="Search country — e.g. Pakistan, Bangladesh, Indonesia…"
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#1877F2]/60 focus:ring-2 focus:ring-[#1877F2]/20 transition"
                />
              </div>
              <button
                onClick={onToggleExpanded}
                className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs font-bold transition shrink-0"
              >
                Close
              </button>
            </div>

            <div className="max-h-[42vh] overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5 bg-slate-950/40">
              {panelRows.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">{loading ? "Loading countries…" : `No country matches “${panelQuery}”.`}</p>
              ) : (
                panelRows.map((p) => {
                  const isActive = selected?.id === p.id;
                  const count = p.count ?? 0;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-3 py-2.5 transition ${isActive ? "bg-[#1877F2]/10" : "hover:bg-white/5"}`}>
                      <button onClick={() => onSelectFromPanel(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left" title="Use this country in the buy box">
                        <span className="text-xl leading-none shrink-0">{getCountryFlagByName(p.name)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-white truncate">
                            {p.name}
                            {isActive && <span className="ml-2 text-[10px] font-bold text-[#8ab9f9] uppercase tracking-wider">selected</span>}
                          </span>
                          <span className="block text-[11px] text-slate-500 uppercase tracking-wider">
                            {p.code} · {p.isCustomRate ? "custom rate" : p.isFixedRate ? "fixed rate" : "live rate"}
                          </span>
                        </span>
                        <span className={`text-[11px] font-bold tabular-nums shrink-0 hidden sm:block ${count > 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {count > 0 ? `${count} in stock` : "out of stock"}
                        </span>
                      </button>
                      <span className="text-sm font-bold text-white tabular-nums shrink-0">{formatPkr(p.pkrPrice)}</span>
                      <button
                        onClick={() => onBuy(p.id)}
                        disabled={busy || count <= 0}
                        className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg fb-gradient text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
                      >
                        Buy
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
              <FacebookLogo size={12} accessible={false} className="rounded-[3px] shrink-0" />
              <span className="text-slate-400">
                <SyncLabel updatedAt={lastUpdated} loading={loading} />
              </span>
              <span className="hidden sm:inline">· {total} countries listed · {panelRows.length} shown</span>
              <span className="hidden md:inline">· every number is single-use for Facebook verification</span>
            </p>
          </div>
        )}
      </div>

      {insufficient && !loading && (
        <p className="mt-2 text-xs text-amber-300 flex flex-wrap items-center gap-2">
          Your balance is below {selected ? formatPkr(selected.pkrPrice) : "this price"}.
          <Link href="/client/deposits" className="underline decoration-dotted underline-offset-2 text-[#8ab9f9] hover:text-white font-semibold">
            Add balance →
          </Link>
        </p>
      )}
    </div>
  );
}

export default function BuyNumber() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [activations, setActivations] = useState<Activation[]>([]);
  const [activationsLoaded, setActivationsLoaded] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [processing, setProcessing] = useState<Set<number>>(new Set());
  const activationsRef = useRef(activations);

  const [copiedNumberId, setCopiedNumberId] = useState<number | null>(null);
  const [copiedOtpId, setCopiedOtpId] = useState<number | null>(null);
  const playedSoundIds = useRef<Set<number>>(new Set());

  const [query, setQuery] = useState("");
  const [panelQuery, setPanelQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("price");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ pinned: true, soundOn: true, ready: false });

  useEffect(() => {
    activationsRef.current = activations;
  }, [activations]);

  // Read browser preferences once after mount (localStorage only exists there).
  useEffect(() => {
    try {
      const stored = window.localStorage;
      const pinned = stored.getItem(PIN_KEY) !== "0";
      const soundOn = stored.getItem(SOUND_KEY) !== "0";
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off hydrate of a browser-only external store
      setPrefs({ pinned, soundOn, ready: true });
    } catch {
      setPrefs((prev) => ({ ...prev, ready: true }));
    }
  }, []);

  // Write them back whenever they change (after the first read, so the stored
  // values are never clobbered by defaults).
  useEffect(() => {
    if (!prefs.ready) return;
    try {
      window.localStorage.setItem(PIN_KEY, prefs.pinned ? "1" : "0");
      window.localStorage.setItem(SOUND_KEY, prefs.soundOn ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const loadActivations = useCallback(() => {
    apiFetch<Activation[]>("/api/client/activations")
      .then((rows) => {
        setActivations(rows.filter((a) => a.status === "pending" || a.status === "completed"));
        setActivationsLoaded(true);
      })
      .catch(() => {});
  }, []);

  const loadBalance = useCallback(() => {
    apiFetch<{ balance: string }>("/api/auth/me")
      .then((u) => setBalance(Number(u.balance || 0)))
      .catch(() => {});
  }, []);

  // `loading` starts as true, so the first render shows skeleton cards.
  // Background refreshes (quiet) never touch the spinner or the error banner,
  // so the visible grid is never replaced by a flicker.
  const refreshPrices = useCallback((quiet: boolean) => {
    apiFetch<Price[]>("/api/client/prices?service=fb")
      .then((rows) => {
        setPrices(rows);
        setLastUpdated(Date.now());
        if (!quiet) setError("");
      })
      .catch((e) => {
        if (!quiet) setError((e as Error).message);
      })
      .finally(() => {
        if (!quiet) {
          setLoading(false);
          setRefreshing(false);
        }
      });
  }, []);

  useEffect(() => {
    refreshPrices(false);
    loadActivations();
    loadBalance();
    const priceInterval = setInterval(() => refreshPrices(true), 30000);
    return () => clearInterval(priceInterval);
  }, [refreshPrices, loadActivations, loadBalance]);

  const manualRefresh = useCallback(() => {
    setRefreshing(true);
    refreshPrices(false);
  }, [refreshPrices]);

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

  // Chime when a new OTP arrives
  useEffect(() => {
    if (!prefs.soundOn) return;
    activations.forEach((a) => {
      if (a.smsCode && a.smsCode.trim() !== "" && !playedSoundIds.current.has(a.id)) {
        playedSoundIds.current.add(a.id);
        playOtpSound();
      }
    });
  }, [activations, prefs.soundOn]);

  const catalogue = useMemo(() => {
    const maxStock = prices.reduce((m, p) => Math.max(m, p.count ?? 0), 0);
    const byPrice = [...prices].sort((a, b) => a.pkrPrice - b.pkrPrice);
    const cheapestId = byPrice.find((p) => (p.count ?? 0) > 0)?.id ?? null;
    const premiumPrice = byPrice.length ? byPrice[byPrice.length - 1].pkrPrice : null;
    return { rows: prices, maxStock, cheapestId, premiumPrice };
  }, [prices]);

  const selected = useMemo(() => {
    const explicit = selectedCountryId === null ? undefined : prices.find((p) => p.id === selectedCountryId);
    if (explicit) return explicit;
    if (catalogue.cheapestId !== null) return prices.find((p) => p.id === catalogue.cheapestId) ?? null;
    return prices[0] ?? null;
  }, [prices, selectedCountryId, catalogue.cheapestId]);

  const rowsFor = useCallback(
    (term: string) => {
      const q = term.trim().toLowerCase();
      let out = q ? prices.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : prices.slice();
      if (inStockOnly) out = out.filter((p) => (p.count ?? 0) > 0);
      out.sort((a, b) => {
        if (sort === "stock") return (b.count ?? 0) - (a.count ?? 0) || a.pkrPrice - b.pkrPrice;
        if (sort === "name") return a.name.localeCompare(b.name);
        return a.pkrPrice - b.pkrPrice || (b.count ?? 0) - (a.count ?? 0);
      });
      return out;
    },
    [prices, inStockOnly, sort]
  );

  const filtered = useMemo(() => rowsFor(query), [rowsFor, query]);
  const panelRows = useMemo(() => rowsFor(panelQuery), [rowsFor, panelQuery]);

  const stats = useMemo(() => {
    const inStock = prices.filter((p) => (p.count ?? 0) > 0);
    const cheapest = inStock.length ? inStock.reduce((m, p) => (p.pkrPrice < m.pkrPrice ? p : m)) : null;
    return {
      countries: prices.length,
      available: inStock.length,
      stock: inStock.reduce((s, p) => s + (p.count ?? 0), 0),
      cheapest: cheapest?.pkrPrice ?? null,
    };
  }, [prices]);

  const liveCounts = useMemo(() => {
    const awaiting = activations.filter((a) => a.status === "pending" && !(a.smsCode && a.smsCode.trim())).length;
    const received = activations.filter((a) => a.smsCode && a.smsCode.trim()).length;
    return { total: activations.length, awaiting, received };
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
        loadBalance();
        refreshPrices(true);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBuying(null);
      }
    },
    [loadActivations, loadBalance, refreshPrices]
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
        await apiFetch(`/api/client/activations/${id}`, { method: "POST", body: JSON.stringify({ action }) });
        await pollActivation(id);
        loadBalance();
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
    [pollActivation, loadBalance]
  );

  const togglePin = useCallback(() => setPrefs((prev) => ({ ...prev, pinned: !prev.pinned })), []);
  const toggleSound = useCallback(() => setPrefs((prev) => ({ ...prev, soundOn: !prev.soundOn })), []);

  return (
    <ClientLayout>
      {/* ── Pinned buy box (top of the page, above the active numbers) ── */}
      <PinnedBuyBox
        total={prices.length}
        selected={selected}
        onBuy={buy}
        buyingId={buying}
        balance={balance}
        loading={loading}
        pinned={prefs.pinned}
        onTogglePin={togglePin}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
        panelQuery={panelQuery}
        onPanelQuery={setPanelQuery}
        panelRows={panelRows}
        onSelectFromPanel={(id) => {
          setSelectedCountryId(id);
          setPanelQuery("");
          setExpanded(false);
        }}
        lastUpdated={lastUpdated}
        onRefresh={manualRefresh}
        refreshing={refreshing}
      />

      {/* ── Header ── */}
      <section className="mt-5 lg:mt-6 relative overflow-hidden rounded-2xl border border-[#1877F2]/25 bg-gradient-to-br from-[#1877F2]/15 via-slate-900/60 to-slate-900/30 p-5 lg:p-6">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#1877F2]/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 p-2.5 fb-glow">
              <FacebookLogo size={44} accessible={false} className="rounded-xl" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8ab9f9]">SMSFlow · Facebook verification service</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight">Facebook Numbers, Live Stock</h1>
              <p className="text-slate-400 text-sm mt-1">
                Instant virtual numbers for Facebook OTP / SMS verification — live stock, transparent PKR pricing, free refund when no code arrives.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSound}
              title={prefs.soundOn ? "Play a chime when an OTP lands" : "OTP chime is muted"}
              aria-pressed={prefs.soundOn}
              className={`h-9 px-3 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 ${
                prefs.soundOn ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-white/5 border-white/10 text-slate-500"
              }`}
            >
              {prefs.soundOn ? "🔔 Chime on" : "🔕 Chime off"}
            </button>
            <button
              onClick={loadActivations}
              title="Reload my active numbers"
              className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold transition"
            >
              Refresh numbers
            </button>
          </div>
        </div>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <StatTile label="Active numbers" value={liveCounts.total} hint={`${liveCounts.awaiting} awaiting SMS`} />
          <StatTile label="Codes received" value={liveCounts.received} hint="ready to paste" tone="text-emerald-400" />
          <StatTile
            label="Countries in stock"
            value={`${stats.available}/${stats.countries}`}
            hint={`${stats.stock.toLocaleString()} numbers available`}
          />
          <StatTile
            label="Lowest price"
            value={stats.cheapest === null ? "—" : `PKR ${stats.cheapest.toFixed(2)}`}
            hint={
              catalogue.premiumPrice && catalogue.premiumPrice > (stats.cheapest ?? 0)
                ? `up to PKR ${catalogue.premiumPrice.toFixed(2)}`
                : "single rate"
            }
            tone="text-[#8ab9f9]"
          />
        </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 mt-5 flex items-start gap-3">
          <span className="text-red-400 mt-0.5">⚠</span>
          <p className="text-red-200 text-sm flex-1">{error}</p>
          <button onClick={() => setError("")} className="text-red-300/70 hover:text-white text-sm px-1" aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      {/* ── Active numbers ── */}
      <section className="mt-6 lg:mt-7">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-[#1877F2]/15 border border-[#1877F2]/30 text-base">🛡️</span>
            My Active Numbers
            {liveCounts.total > 0 && (
              <span className="text-[11px] font-bold bg-[#1877F2]/15 text-[#8ab9f9] border border-[#1877F2]/30 rounded-full px-2 py-0.5 tabular-nums">
                {liveCounts.total}
              </span>
            )}
          </h2>
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
            Auto-checking every 5s
          </span>
        </div>

        {activations.length > 0 ? (
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
        ) : activationsLoaded ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-center">
            <FacebookLogo size={40} accessible={false} className="rounded-xl mx-auto mb-3 fb-badge-bloom" />
            <p className="font-bold text-white">No active numbers right now</p>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Pick a country in the pinned box above and tap <span className="text-slate-300 font-semibold">Buy now</span>. Your number and the
              incoming Facebook OTP will show up here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
      </section>

      {/* ── Country catalogue ── */}
      <section className="mt-8 lg:mt-10" id="countries">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-base">🌍</span>
            Facebook Numbers by Country
            {loading && <span className="text-[11px] font-semibold text-slate-500 animate-pulse">syncing…</span>}
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                className="w-44 sm:w-56 bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#1877F2]/60 focus:ring-2 focus:ring-[#1877F2]/20 transition"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              title="Sort countries"
              className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 focus:outline-none focus:border-[#1877F2]/60 transition"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABELS[k]}
                </option>
              ))}
            </select>
            <button
              onClick={() => setInStockOnly((v) => !v)}
              aria-pressed={inStockOnly}
              className={`h-[34px] px-3 rounded-xl text-xs font-bold border transition ${
                inStockOnly ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              In stock only
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <CountryCard
                  key={p.id}
                  price={p}
                  isBuying={buying === p.id}
                  disabled={buying !== null}
                  stockPercent={catalogue.maxStock > 0 ? ((p.count ?? 0) / catalogue.maxStock) * 100 : 0}
                  isCheapest={p.id === catalogue.cheapestId}
                  onBuy={buy}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-500">
                Nothing matches that filter.
                <button onClick={() => setQuery("")} className="ml-2 text-[#8ab9f9] font-bold hover:underline">
                  Clear search
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Help ── */}
      <section className="mt-8 lg:mt-10 rounded-2xl border border-white/10 bg-slate-900/70 p-5 lg:p-6">
        <details>
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="font-bold text-white flex items-center gap-2">
              <FacebookLogo size={18} accessible={false} className="rounded-[5px]" />
              How it works
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">3 steps</span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { n: 1, t: "Pick a country and buy", d: "The number is reserved instantly from live stock and the amount is deducted from your balance." },
              { n: 2, t: "Paste it on Facebook", d: "Use it for signup or login. The OTP lands on this page automatically and you hear a chime." },
              { n: 3, t: "No code? Full refund", d: "Cancel inside the free window and the amount goes straight back to your balance." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl bg-slate-950/50 border border-white/5 p-4">
                <span className="grid place-items-center w-7 h-7 rounded-lg fb-gradient text-white text-xs font-bold mb-2.5">{s.n}</span>
                <p className="font-bold text-white text-sm">{s.t}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      <p className="mt-6 pb-2 text-[11px] text-slate-600 text-center flex items-center justify-center gap-1.5">
        <FacebookLogo size={12} accessible={false} className="rounded-[3px] shrink-0" />
        Facebook is a trademark of Meta Platforms, Inc. — shown here only to identify the service being ordered.
      </p>
    </ClientLayout>
  );
}

function StatTile({ label, value, hint, tone = "text-white" }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-950/50 border border-white/5 px-3.5 py-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
      <p className={`text-lg lg:text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 truncate">{hint}</p>}
    </div>
  );
}
