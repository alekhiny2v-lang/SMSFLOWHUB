import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FacebookChip, FacebookLogo } from "@/components/FacebookLogo";
import { SMSFlowLogo } from "@/components/SMSFlowLogo";

/**
 * Public landing page for signed-out visitors. Signed-in users go straight
 * to their panel.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin/dashboard" : "/client/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas text-fg relative overflow-hidden">
      {/* ── Ambient background ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="blob w-[46rem] h-[46rem] bg-brand/20 -top-56 left-1/4" />
        <div className="blob w-[34rem] h-[34rem] bg-brand-deep/12 top-1/3 -right-40" style={{ animationDelay: "-8s" }} />
        <div className="blob w-[28rem] h-[28rem] bg-white/[0.04] bottom-0 -left-32" style={{ animationDelay: "-14s" }} />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
      </div>

      {/* ── Nav ── */}
      <header className="relative border-b border-white/5 bg-canvas/70 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-brand/25">
              <Image src="/logo.png" alt="SMSFlow" width={40} height={40} className="w-full h-full object-cover" priority />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">SMSFlow</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-brand-soft font-bold leading-tight">Verification Panel</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="btn-ghost py-2! text-xs sm:text-sm">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary py-2! text-xs sm:text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative">
        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 lg:pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 mb-6">
              <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 text-emerald-400 live-ping" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-soft">Live stock · updated in real time</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-bold text-white leading-[1.08] tracking-tight">
              Facebook verification numbers,{" "}
              <span className="bg-gradient-to-r from-brand-soft via-brand to-brand-soft bg-clip-text text-transparent">
                delivered in seconds
              </span>
            </h1>
            <p className="text-muted text-base sm:text-lg mt-5 max-w-xl leading-relaxed">
              Buy virtual numbers from 100+ countries, receive Facebook OTP codes instantly on your dashboard, and pay
              transparently in PKR. No code? Automatic full refund.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-8">
              <Link href="/signup" className="btn-primary px-6! py-3.5! text-sm btn-shine">
                <FacebookLogo size={16} variant="glyph" accessible={false} />
                Start verifying free
              </Link>
              <Link href="/login" className="btn-ghost px-6! py-3.5! text-sm">
                Sign in to panel →
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10">
              {[
                { v: "100+", l: "Countries" },
                { v: "< 10s", l: "Average delivery" },
                { v: "PKR", l: "Transparent pricing" },
                { v: "100%", l: "Refund guarantee" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-2xl font-bold text-white">{s.v}</p>
                  <p className="text-[11px] uppercase tracking-widest text-muted font-bold mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* OTP card mockup */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 bg-brand/15 blur-3xl rounded-full" aria-hidden="true" />
            <div className="relative rounded-3xl border border-brand/30 bg-surface/90 backdrop-blur-xl shadow-2xl brand-glow p-5 sm:p-6">
              <div className="absolute inset-y-0 left-0 w-1.5 brand-gradient rounded-l-3xl" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3 mb-4 pl-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-3xl leading-none">🇵🇰</span>
                  <div>
                    <p className="font-bold text-white">Pakistan</p>
                    <p className="text-[11px] text-muted uppercase tracking-wider font-semibold">Facebook verification</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Code received
                </span>
              </div>
              <p className="pl-2 text-fg font-mono text-lg">+92 300 1234567</p>
              <div className="mt-3 rounded-2xl bg-canvas/70 border border-white/5 p-4 text-center">
                <p className="text-[10px] text-muted mb-2 uppercase tracking-[0.2em] font-bold">Facebook OTP / SMS code</p>
                <p className="text-4xl font-bold text-emerald-400 font-mono tracking-[0.18em]">884721</p>
              </div>
              <div className="mt-4 pl-2">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-muted">Free-cancel window</span>
                  <span className="font-mono font-bold text-fg-soft tabular-nums">18:42</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full brand-gradient" style={{ width: "72%" }} />
                </div>
              </div>
              <div className="mt-4 pl-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FacebookChip />
                  <span className="text-[11px] text-muted bg-canvas/60 border border-white/5 px-2 py-1 rounded-lg font-semibold tabular-nums">
                    PKR 12.00
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">✓ Auto-refund ready</span>
              </div>
            </div>

            {/* floating mini card */}
            <div className="hidden sm:block absolute -bottom-6 -left-8 rounded-2xl border border-white/10 bg-surface/95 backdrop-blur-xl shadow-xl px-4 py-3 animate-fade-in">
              <div className="flex items-center gap-2.5">
                <span className="grid place-items-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm">🔔</span>
                <div>
                  <p className="text-xs font-bold text-white">OTP chime</p>
                  <p className="text-[10px] text-muted">Know the moment it lands</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft mb-2">Why SMSFlow</p>
            <h2 className="text-3xl font-bold text-white">Built for speed, priced for everyone</h2>
            <p className="text-muted text-sm mt-3">
              Everything you need to verify Facebook accounts — in one clean panel.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "⚡", t: "Instant delivery", d: "Numbers reserved in milliseconds and OTP codes appear live on your dashboard with an audible chime." },
              { icon: "🌍", t: "100+ countries", d: "Live stock across the globe with cheapest-first sorting so you always get the best rate." },
              { icon: "💱", t: "Transparent PKR pricing", d: "What you see is what you pay. Custom per-user rates available on request." },
              { icon: "🛡️", t: "Refund guarantee", d: "No code within the free-cancel window? One tap returns 100% of your amount to your balance." },
              { icon: "🔐", t: "Single-use numbers", d: "Every number is fresh and single-use for Facebook — never recycled, never shared." },
              { icon: "💬", t: "WhatsApp support", d: "Real humans on WhatsApp 24/7 whenever you need help with an order." },
            ].map((f) => (
              <div key={f.t} className="group bg-surface/70 border border-white/10 rounded-2xl p-5 card-hover hover:border-brand/40 transition-colors">
                <span className="grid place-items-center w-11 h-11 rounded-xl bg-brand/10 border border-brand/25 text-lg mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </span>
                <h3 className="font-bold text-white">{f.t}</h3>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-soft mb-2">3 simple steps</p>
            <h2 className="text-3xl font-bold text-white">From sign-up to OTP in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
            {[
              { n: 1, t: "Create & top up", d: "Register free, then add balance via JazzCash, EasyPaisa, NayaPay or bank transfer." },
              { n: 2, t: "Pick a country & buy", d: "Choose from live stock, and your number is reserved instantly with the price shown up front." },
              { n: 3, t: "Paste & verify", d: "Use the number on Facebook — the OTP lands on your dashboard automatically. Copy, paste, done." },
            ].map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-surface/90 to-surface/50 p-6 card-hover">
                <span className="grid place-items-center w-10 h-10 rounded-xl brand-gradient text-ink text-sm font-bold shadow-lg shadow-brand/25 mb-4">
                  {s.n}
                </span>
                <h3 className="font-bold text-white text-lg">{s.t}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/20 via-surface/70 to-surface/40 p-8 sm:p-12 text-center">
            <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-brand-deep/12 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden border border-white/10 shadow-lg shadow-brand/25 mb-5 brand-badge-bloom">
                <SMSFlowLogo size={80} priority />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">Ready to verify your first number?</h2>
              <p className="text-fg-soft text-sm sm:text-base mt-3 max-w-xl mx-auto">
                Join SMSFlow free — your first Facebook OTP is only a country click away.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                <Link href="/signup" className="btn-primary px-7! py-3.5! text-sm btn-shine">
                  Create free account
                </Link>
                <Link href="/login" className="btn-ghost px-7! py-3.5! text-sm">
                  I already have one
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FacebookLogo size={18} accessible={false} className="rounded-[5px]" />
            <p className="text-xs text-muted">
              Facebook is a trademark of Meta Platforms, Inc. — shown only to identify the service being ordered.
            </p>
          </div>
          <p className="text-xs text-muted/70">© {new Date().getFullYear()} SMSFlow · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
