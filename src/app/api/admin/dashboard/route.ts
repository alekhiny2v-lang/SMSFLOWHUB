import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, activations, proxies, proxyPurchases } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const allUsers = await db.select().from(users);
    // "Deposits approved" only counts money coming in (deposit requests and
    // manual deposits) — number/proxy purchases are spending, not income.
    const completedTransactions = (await db.select().from(transactions)).filter(
      (row) => row.status === "completed" && (row.type === "deposit" || row.type === "deposit_request"),
    );
    const allActivations = await db.select().from(activations);
    const allProxies = await db.select().from(proxies);
    const allProxyPurchases = await db.select().from(proxyPurchases);

    const userStats = { count: allUsers.length, totalBalance: allUsers.reduce((sum, row) => sum + Number(row.balance || 0), 0).toFixed(4) };
    const transactionStats = { total: completedTransactions.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(4) };
    const activationStats = {
      count: allActivations.length,
      pending: allActivations.filter((row) => row.status === "pending").length,
      completed: allActivations.filter((row) => row.status === "completed").length,
      cancelled: allActivations.filter((row) => row.status === "cancelled").length,
    };
    const activeProxies = allProxies.filter((row) => row.active !== false);
    const proxyStats = {
      packages: activeProxies.length,
      stock: activeProxies.reduce((sum, row) => sum + Number(row.stock || 0), 0),
      sold: allProxyPurchases.length,
      revenue: allProxyPurchases.reduce((sum, row) => sum + Number(row.pricePkr || 0), 0),
    };

    return NextResponse.json({
      users: userStats,
      transactions: transactionStats,
      activations: activationStats,
      proxies: proxyStats,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
