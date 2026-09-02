import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { depositAccounts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(depositAccounts).orderBy(desc(depositAccounts.sortOrder), depositAccounts.createdAt);
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { type, accountName, accountNumber, instructions = "", active = true, sortOrder = 0 } = body;

    if (!type || !accountName || !accountNumber) {
      return NextResponse.json({ error: "Type, account name and account number required" }, { status: 400 });
    }

    const rows = await db
      .insert(depositAccounts)
      .values({
        type: String(type).trim(),
        accountName: String(accountName).trim(),
        accountNumber: String(accountNumber).trim(),
        instructions: String(instructions).trim(),
        active: Boolean(active),
        sortOrder: Number(sortOrder),
      })
      .returning();

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
