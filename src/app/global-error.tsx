"use client";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself, where
 * `app/error.tsx` can no longer take over. It must render its own <html>/<body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020617",
          color: "#e2e8f0",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "28rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(15,23,42,0.9)",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#94a3b8" }}>
            The app failed to load. Retry — if it persists, check the deployment environment variables.
          </p>
          {error?.message ? (
            <p
              style={{
                marginTop: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(2,6,23,0.7)",
                padding: "0.5rem 0.75rem",
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#94a3b8",
                textAlign: "left",
                wordBreak: "break-word",
              }}
            >
              {error.message}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              borderRadius: "0.75rem",
              padding: "0.625rem 1.1rem",
              border: "none",
              background: "linear-gradient(135deg, #1877F2, #2563eb)",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
