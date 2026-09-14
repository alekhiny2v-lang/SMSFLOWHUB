import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { proxies } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { host, port, username, password, country, trafficGb, stock, pricePkr, active, notes } = body;

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (host !== undefined) values.host = String(host).trim();
    if (port !== undefined) values.port = String(port).trim();
    if (username !== undefined) values.username = String(username).trim();
    if (password !== undefined) values.password = String(password).trim();
    if (country !== undefined) values.country = String(country).trim();
    if (trafficGb !== undefined) values.trafficGb = Number(trafficGb) || 0;
    if (stock !== undefined) values.stock = Math.max(0, Math.floor(Number(stock) || 0));
    if (pricePkr !== undefined) values.pricePkr = Number(pricePkr) || 0;
    if (active !== undefined) values.active = Boolean(active);
    if (notes !== undefined) values.notes = String(notes).trim();

    const rows = await db
      .update(proxies)
      .set(values)
      .where(eq(proxies.id, Number(id)))
      .returning();

    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.delete(proxies).where(eq(proxies.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
