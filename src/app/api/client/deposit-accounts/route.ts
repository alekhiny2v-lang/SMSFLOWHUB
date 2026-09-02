import { NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { depositAccounts } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const rows = await db
      .select()
      .from(depositAccounts)
      .where(eq(depositAccounts.active, true))
      .orderBy(desc(depositAccounts.sortOrder), depositAccounts.createdAt);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
