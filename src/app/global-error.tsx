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
          background: "#0A0A0A",
          color: "#FFFFFF",
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
            background: "#1A1A1E",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#9CA3AF" }}>
            The app failed to load. Retry — if it persists, check the deployment environment variables.
          </p>
          {error?.message ? (
            <p
              style={{
                marginTop: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.05)",
                background: "#121215",
                padding: "0.5rem 0.75rem",
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#9CA3AF",
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
              background: "linear-gradient(135deg, #FFB020, #FF9900)",
              color: "#0A0A0A",
              fontSize: "0.875rem",
              fontWeight: 700,
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
