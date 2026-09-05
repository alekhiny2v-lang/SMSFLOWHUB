"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary.
 *
 * Without this, any thrown error inside a server component is rendered by the
 * host's bare "A server error occurred" page with no way back into the app.
 * Here the user at least gets a retry plus a link to the health check.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[smsflow] page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-2xl text-red-400">
          ⚠
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-400">
          This page hit an unexpected error. It is usually temporary — retrying is often enough.
        </p>

        {error?.message ? (
          <p className="mt-4 rounded-xl border border-white/5 bg-slate-950/70 px-3 py-2 text-left font-mono text-[11px] break-words text-slate-400">
            {error.message}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary text-sm">
            Try again
          </button>
          <Link href="/login" className="btn-ghost text-sm">
            Go to sign in
          </Link>
        </div>

        <p className="mt-5 text-[11px] text-slate-500">
          If it keeps failing, open <Link href="/api/health" className="text-[#8ab9f9] underline">/api/health</Link> to
          see which environment variables or database connection are missing.
        </p>
      </div>
    </div>
  );
}
