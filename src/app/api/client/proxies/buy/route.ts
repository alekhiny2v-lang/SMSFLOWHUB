import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db, getDb } from "@/db";
import { users, proxies, proxyPurchases, transactions } from "@/db/schema";
import { requireAuth, refreshSessionUser } from "@/lib/auth";

/**
 * Buy one proxy account.
 *
 * Sales are final: the moment stock is taken and the balance is charged the
 * credentials are delivered — there is no refund flow, by design (proxies are
 * shared secrets; once shown, they cannot be "returned"). The stock decrement
 * is a single atomic `findOneAndUpdate` so two clients can never buy the same
 * last unit of stock.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { proxyId } = body;

    if (!proxyId) {
      return NextResponse.json({ error: "Proxy required" }, { status: 400 });
    }

    const proxyRows = await db.select().from(proxies).where(eq(proxies.id, Number(proxyId)));
    const proxy = proxyRows[0];
    if (!proxy || proxy.active === false) {
      return NextResponse.json({ error: "Proxy not available" }, { status: 400 });
    }

    const stock = Number(proxy.stock || 0);
    const pricePkr = Number(proxy.pricePkr || 150);

    if (stock < 1) {
      return NextResponse.json({ error: "Out of stock" }, { status: 400 });
    }

    const userRows = await db.select({ balance: users.balance }).from(users).where(eq(users.id, user.id));
    const balance = Number(userRows[0]?.balance || 0);
    if (balance < pricePkr) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    // Atomic stock grab: only succeeds while the package is active and still
    // has stock. If someone bought the last unit between our reads, the update
    // matches nothing and the sale is rejected instead of overselling.
    const collection = (await getDb()).collection(proxies.collection);
    const updated = await collection.findOneAndUpdate(
      { id: Number(proxyId), active: true, stock: { $gte: 1 } },
      { $inc: { stock: -1, sold: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) {
      return NextResponse.json({ error: "Just sold out — try another proxy" }, { status: 400 });
    }

    const credentials = `${proxy.host}:${proxy.port}:${proxy.username}:${proxy.password}`;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: String((balance - pricePkr).toFixed(4)), updatedAt: now })
        .where(eq(users.id, user.id));

      await tx.insert(transactions).values({
        userId: user.id,
        type: "proxy_purchase",
        amount: String(pricePkr.toFixed(4)),
        status: "completed",
        method: "balance",
        notes: `Bought proxy ${proxy.host}:${proxy.port} (${proxy.country || "no country"})`,
      });

      await tx.insert(proxyPurchases).values({
        userId: user.id,
        proxyId: proxy.id,
        host: String(proxy.host),
        port: String(proxy.port),
        country: String(proxy.country || ""),
        trafficGb: Number(proxy.trafficGb) || 0,
        credentials,
        pricePkr: String(pricePkr.toFixed(4)),
        status: "completed",
      });
    });

    await refreshSessionUser(user.id);

    return NextResponse.json({
      id: proxy.id,
      credentials,
      host: String(proxy.host),
      port: String(proxy.port),
      country: String(proxy.country || ""),
      trafficGb: Number(proxy.trafficGb) || 0,
      pricePkr,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
