import { NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { activations, countries } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { getCountryFlag } from "@/lib/country";

const TIMEOUT_MINUTES = 20;

export async function GET() {
  try {
    const user = await requireAuth();
    const rows = await db
      .select({
        id: activations.id,
        countryId: activations.countryId,
        countryName: countries.name,
        countryCode: countries.code,
        smsbowerActivationId: activations.smsbowerActivationId,
        service: activations.service,
        phoneNumber: activations.phoneNumber,
        cost: activations.salePrice,
        salePrice: activations.salePrice,
        status: activations.status,
        smsCode: activations.smsCode,
        smsText: activations.smsText,
        createdAt: activations.createdAt,
        updatedAt: activations.updatedAt,
      })
      .from(activations)
      .leftJoin(countries, eq(activations.countryId, countries.id))
      .where(eq(activations.userId, user.id))
      .orderBy(desc(activations.createdAt));

    const enriched = rows.map((a) => {
      const canCancel = a.status === "pending" && !a.smsCode;
      const elapsed = Date.now() - new Date(a.createdAt).getTime();
      const timeRemainingMs = canCancel ? Math.max(0, TIMEOUT_MINUTES * 60 * 1000 - elapsed) : 0;
      // Flag resolved from the stored country code, or the name for legacy rows.
      return { ...a, canCancel, timeRemainingMs, flag: getCountryFlag(a.countryCode || a.countryName) };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
