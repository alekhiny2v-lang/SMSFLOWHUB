import { NextRequest, NextResponse } from "next/server";
import { desc } from "@/db/query";
import { db } from "@/db";
import { proxies } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(proxies).orderBy(desc(proxies.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const {
      host,
      port,
      username,
      password,
      country = "",
      trafficGb,
      stock = 1,
      pricePkr = 150,
      active = true,
      notes = "",
    } = body;

    if (!host || !port || !username || !password) {
      return NextResponse.json({ error: "Host, port, username and password are required" }, { status: 400 });
    }

    const rows = await db
      .insert(proxies)
      .values({
        host: String(host).trim(),
        port: String(port).trim(),
        username: String(username).trim(),
        password: String(password).trim(),
        country: String(country).trim(),
        trafficGb: Number(trafficGb) || 0,
        stock: Math.max(0, Math.floor(Number(stock) || 0)),
        sold: 0,
        pricePkr: Number(pricePkr) || 0,
        active: Boolean(active),
        notes: String(notes).trim(),
      })
      .returning();

    return NextResponse.json(rows[0]);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
