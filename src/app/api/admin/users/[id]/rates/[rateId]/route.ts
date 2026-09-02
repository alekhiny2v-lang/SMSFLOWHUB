import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { userCountryRates } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; rateId: string }> }) {
  try {
    await requireAdmin();
    const { rateId } = await params;
    await db.delete(userCountryRates).where(eq(userCountryRates.id, Number(rateId)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
