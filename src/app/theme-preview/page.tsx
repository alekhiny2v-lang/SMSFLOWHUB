"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TableCard } from "@/components/TableCard";
import {
  EmptyState,
  InfoRow,
  PageHero,
  SectionHeading,
  StatCard,
  StatusPill,
  type StatTone,
} from "@/components/ui";
import { FacebookChip, FacebookLogo } from "@/components/FacebookLogo";
import { SMSFlowLogo } from "@/components/SMSFlowLogo";

/**
 * Offline style guide: renders the shared primitives with mock data so the
 * palette can be reviewed without a live database. Safe to delete — nothing
 * in the app links to it.
 */

const SWATCHES: { name: string; hex: string; note: string }[] = [
  { name: "canvas", hex: "#0A0A0A", note: "page background" },
  { name: "surface", hex: "#1A1A1E", note: "cards / elevated" },
  { name: "elevated", hex: "#23232A", note: "nested chips" },
  { name: "fg", hex: "#FFFFFF", note: "primary text" },
  { name: "muted", hex: "#9CA3AF", note: "labels / placeholders" },
  { name: "brand", hex: "#FF9900", note: "CTA / active" },
  { name: "brand-deep", hex: "#F59E0B", note: "gradient end" },
  { name: "brand-soft", hex: "#FFC46B", note: "accent text" },
];

const STATS: { label: string; value: string; hint: string; icon: string; tone: StatTone }[] = [
  { label: "Wallet balance", value: "PKR 1,240.00", hint: "available to spend", icon: "💰", tone: "emerald" },
  { label: "My numbers", value: "38", hint: "all-time purchases", icon: "📱", tone: "brand" },
  { label: "Awaiting SMS", value: "3", hint: "auto-checking every 5s", icon: "⏳", tone: "info" },
  { label: "Codes received", value: "34", hint: "ready to paste", icon: "✅", tone: "white" },
  { label: "Failed orders", value: "1", hint: "refunded automatically", icon: "⚠️", tone: "red" },
];

const ROWS = [
  { id: 1042, user: "ali_khan", country: "Pakistan", phone: "+92 300 1234567", price: "12.00", status: "completed", code: "884721" },
  { id: 1043, user: "sana_01", country: "Indonesia", phone: "+62 812 445 991", price: "18.50", status: "pending", code: "" },
  { id: 1044, user: "verify_hub", country: "Bangladesh", phone: "+880 1712 556 780", price: "9.75", status: "cancelled", code: "" },
  { id: 1045, user: "numan", country: "India", phone: "+91 98200 11223", price: "11.20", status: "completed", code: "512904" },
];

export default function ThemePreviewPage() {
  const [query, setQuery] = useState("");

  const filtered = ROWS.filter((r) =>
    `${r.user} ${r.country} ${r.phone}`.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="page-bg" aria-hidden="true" />
      <Sidebar role="admin" username="admin" balance="4820.5" onLogout={() => {}} open={false} onClose={() => {}} />

      <main className="flex-1 p-4 lg:p-8 overflow-x-clip">
        <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
          <PageHero
            eyebrow="Style guide"
            title="Dark mode palette"
            description="Pitch-black canvas, charcoal cards, white type and a vivid amber accent for calls to action, active states and badges."
            icon={<SMSFlowLogo size={48} className="rounded-2xl" />}
          >
            <button className="btn-primary btn-shine">
              <FacebookLogo size={14} variant="glyph" accessible={false} />
              Primary action
            </button>
            <button className="btn-ghost">Secondary</button>
          </PageHero>

          {/* ── Swatches ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            {SWATCHES.map((s) => (
              <div key={s.name} className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
                <div className="h-16" style={{ background: s.hex }} />
                <div className="p-3">
                  <p className="text-xs font-bold text-white">{s.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted mt-0.5">{s.hex}</p>
                  <p className="text-[10px] text-muted/70 mt-1 leading-snug">{s.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Navigation & badges ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3">Nav states</p>
              <div className="space-y-1.5">
                {[
                  { label: "Dashboard", icon: "📊", active: true },
                  { label: "Users", icon: "👥", active: false },
                  { label: "Countries", icon: "🌍", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm ${
                      item.active
                        ? "bg-gradient-to-r from-brand/25 to-brand/5 text-white shadow-lg shadow-brand/15"
                        : "text-muted hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand ${
                        item.active ? "opacity-100" : "opacity-0"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="font-semibold">{item.label}</span>
                    {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-soft" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted font-bold mb-3">Badges &amp; pills</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5 tabular-nums">
                  4
                </span>
                <StatusPill status="completed" />
                <StatusPill status="pending" />
                <StatusPill status="cancelled" />
                <StatusPill status="active" />
                <StatusPill status="inactive" />
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize bg-brand/15 text-brand border-brand/30">
                  admin
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize bg-white/5 text-muted border-white/10">
                  client
                </span>
              </div>
              <p className="text-xs text-muted mt-4 leading-relaxed">
                Amber is reserved for primary actions, active states and badges — pending states stay blue so a
                CTA never looks like a status.
              </p>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {STATS.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} icon={s.icon} tone={s.tone} />
            ))}
          </div>

          {/* ── Form controls ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-surface shadow-xl p-5">
              <SectionHeading icon="⌨️" title="Form controls">
                <span className="text-[11px] font-bold bg-brand/15 text-brand-soft border border-brand/30 rounded-full px-2 py-0.5">
                  live
                </span>
              </SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="tp-user">
                    Username
                  </label>
                  <input id="tp-user" className="input" placeholder="Enter username" />
                </div>
                <div>
                  <label className="label" htmlFor="tp-country">
                    Country
                  </label>
                  <select id="tp-country" className="input" defaultValue="Pakistan">
                    <option>Pakistan</option>
                    <option>Indonesia</option>
                    <option>Bangladesh</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="tp-amount">
                    Amount (PKR)
                  </label>
                  <input id="tp-amount" className="input" placeholder="e.g. 500" type="number" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none rounded-xl border border-white/10 bg-canvas/70 px-4 py-2.5 w-full">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-brand" />
                    <span className="text-sm text-fg-soft font-semibold">Active for clients</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-5">
                <button className="btn-primary btn-shine">Save changes</button>
                <button className="btn-ghost">Cancel</button>
                <button className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition">
                  Row action
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-surface shadow-xl p-5">
              <h3 className="font-bold text-white mb-1">Account</h3>
              <p className="text-xs text-muted mb-3">Label / value pairs inherit the muted treatment.</p>
              <InfoRow label="Username" value="admin" />
              <InfoRow label="Wallet" value={<span className="text-emerald-400 tabular-nums">PKR 4,820.50</span>} />
              <InfoRow label="Role" value={<span className="text-brand capitalize font-bold">admin</span>} />
              <InfoRow label="Member since" value="2026-01-04" />
              <div className="mt-4 rounded-xl bg-canvas/60 border border-white/5 p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-bold">Facebook OTP</p>
                <p className="text-3xl font-bold text-emerald-400 font-mono tracking-[0.18em] mt-1">884721</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <FacebookChip />
                  <span className="text-[11px] text-muted bg-canvas/60 border border-white/5 px-2 py-1 rounded-lg font-semibold tabular-nums">
                    PKR 12.00
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div>
            <SectionHeading icon="🗂️" title="Activation log">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none">⌕</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search user, country, number…"
                  className="input pl-8! w-56! py-2! text-xs"
                />
              </div>
            </SectionHeading>
            {filtered.length === 0 ? (
              <EmptyState title="Nothing matches that search" description="Try a different term." />
            ) : (
              <TableCard>
                <table className="w-full text-left min-w-[760px]">
                  <thead>
                    <tr>
                      <th className="th">ID</th>
                      <th className="th">User</th>
                      <th className="th">Country</th>
                      <th className="th">Phone</th>
                      <th className="th">Price</th>
                      <th className="th">Status</th>
                      <th className="th">Code</th>
                      <th className="th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="tr-hover">
                        <td className="td text-muted tabular-nums">{r.id}</td>
                        <td className="td font-semibold text-white">{r.user}</td>
                        <td className="td">{r.country}</td>
                        <td className="td font-mono">{r.phone}</td>
                        <td className="td font-bold text-emerald-400 tabular-nums">PKR {r.price}</td>
                        <td className="td">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="td font-mono font-bold">
                          {r.code ? (
                            <span className="text-emerald-400 tracking-wider">{r.code}</span>
                          ) : (
                            <span className="text-muted/70">-</span>
                          )}
                        </td>
                        <td className="td">
                          <span className="flex items-center gap-1.5">
                            <button className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-brand/15 text-muted hover:text-brand border border-white/10 hover:border-brand/30 transition">
                              Edit
                            </button>
                            <button className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 transition">
                              Delete
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            )}
          </div>

          {/* ── Progress / stock meter ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Healthy stock", pct: 82, bar: "bg-emerald-500", value: "1,284 left" },
              { label: "Low stock", pct: 22, bar: "bg-brand", value: "37 left" },
              { label: "Timeout window", pct: 48, bar: "bg-brand", value: "09:12" },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl border border-white/10 bg-surface shadow-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted font-bold">{m.label}</p>
                  <p className="text-sm font-bold text-white tabular-nums">{m.value}</p>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <EmptyState
            icon={<span className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-brand/25 brand-badge-bloom"><SMSFlowLogo size={40} /></span>}
            title="Empty state"
            description="Dashed, charcoal and centred — with an amber call to action."
            action={<button className="btn-primary btn-shine">Buy your first number</button>}
          />
        </div>
      </main>
    </div>
  );
}
