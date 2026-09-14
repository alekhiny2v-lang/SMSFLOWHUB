import { NextResponse } from "next/server";
import { eq, and, desc } from "@/db/query";
import { db } from "@/db";
import { proxies } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

/**
 * Public catalog of proxies available to buy.
 *
 * Deliberately excludes the credential fields — those are only delivered
 * after a completed purchase, via /api/client/proxies/buy.
 */
export async function GET() {
  try {
    await requireAuth();
    const rows = await db.select().from(proxies).orderBy(desc(proxies.createdAt));
    const available = rows
      .filter((row) => row.active !== false && Number(row.stock || 0) > 0)
      .map((row) => ({
        id: row.id,
        host: row.host,
        port: row.port,
        country: row.country,
        trafficGb: row.trafficGb,
        stock: Number(row.stock || 0),
        pricePkr: Number(row.pricePkr || 0),
      }));
    return NextResponse.json(available);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
