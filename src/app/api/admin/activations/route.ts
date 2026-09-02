import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "@/db/query";
import { db } from "@/db";
import { activations, users, countries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    let query = db
      .select({
        id: activations.id,
        userId: activations.userId,
        username: users.username,
        countryId: activations.countryId,
        countryName: countries.name,
        countryCode: countries.code,
        smsbowerActivationId: activations.smsbowerActivationId,
        service: activations.service,
        phoneNumber: activations.phoneNumber,
        cost: activations.cost,
        salePrice: activations.salePrice,
        status: activations.status,
        smsCode: activations.smsCode,
        createdAt: activations.createdAt,
        updatedAt: activations.updatedAt,
      })
      .from(activations)
      .leftJoin(users, eq(activations.userId, users.id))
      .leftJoin(countries, eq(activations.countryId, countries.id))
      .orderBy(desc(activations.createdAt));

    if (userId) {
      query = query.where(eq(activations.userId, Number(userId))) as typeof query;
    }
    if (status) {
      query = query.where(eq(activations.status, status)) as typeof query;
    }

    const rows = await query;
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
