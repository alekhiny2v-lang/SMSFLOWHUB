import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { activations } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activationId, code, text } = body;

    if (!activationId) {
      return NextResponse.json({ error: "activationId required" }, { status: 400 });
    }

    await db
      .update(activations)
      .set({
        smsCode: code ? String(code) : undefined,
        smsText: text ? String(text) : undefined,
        status: code ? "completed" : "pending",
        updatedAt: new Date(),
      })
      .where(eq(activations.smsbowerActivationId, String(activationId)));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
