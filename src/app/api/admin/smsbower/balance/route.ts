import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBalance, parseBalance } from "@/lib/smsbower";

export async function GET() {
  try {
    await requireAdmin();
    const res = await getBalance();
    const balance = parseBalance(res);
    return NextResponse.json({ raw: res, balance });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
