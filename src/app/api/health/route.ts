import { checkDbHealth } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Deployment self-check.
 *
 * Visiting `/api/health` is the fastest way to see why a hosted deployment
 * returns server errors: it reports which environment variables are set (never
 * their values), whether MongoDB answers a ping, and — when the connection is
 * down — the exact driver error (e.g. "Server selection timed out" for an Atlas
 * IP allowlist problem, or authentication failures for a wrong password).
 */
export async function GET() {
  const requiredEnv = {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    JWT_SECRET: Boolean(process.env.JWT_SECRET),
  };
  // Optional: MONGODB_DB falls back to the database in the URI (or "smsflow"),
  // and SMSBOWER_API_KEY is only needed for buying numbers.
  const optionalEnv = {
    MONGODB_DB: Boolean(process.env.MONGODB_DB),
    SMSBOWER_API_KEY: Boolean(process.env.SMSBOWER_API_KEY),
  };

  const database = await checkDbHealth();
  const missingEnv = Object.entries(requiredEnv)
    .filter(([, present]) => !present)
    .map(([name]) => name);
  const ok = database.ok;

  return Response.json(
    {
      ok,
      node: process.env.NODE_ENV ?? "development",
      env: { ...requiredEnv, ...optionalEnv },
      database: database.ok ? "connected" : database.error,
      missingEnv,
    },
    { status: ok ? 200 : 503 },
  );
}
