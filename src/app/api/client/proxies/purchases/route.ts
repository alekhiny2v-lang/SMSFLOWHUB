import { NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { proxyPurchases } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

/**
 * The signed-in client's own proxy purchases, newest first.
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const rows = await db
      .select()
      .from(proxyPurchases)
      .where(eq(proxyPurchases.userId, user.id))
      .orderBy(desc(proxyPurchases.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
