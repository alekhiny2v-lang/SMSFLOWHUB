import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, transactions, activations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const allUsers = await db.select().from(users);
    const completedTransactions = (await db.select().from(transactions)).filter((row) => row.status === "completed");
    const allActivations = await db.select().from(activations);
    const userStats = { count: allUsers.length, totalBalance: allUsers.reduce((sum, row) => sum + Number(row.balance || 0), 0).toFixed(4) };
    const transactionStats = { total: completedTransactions.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(4) };
    const activationStats = {
      count: allActivations.length,
      pending: allActivations.filter((row) => row.status === "pending").length,
      completed: allActivations.filter((row) => row.status === "completed").length,
      cancelled: allActivations.filter((row) => row.status === "cancelled").length,
    };

    return NextResponse.json({
      users: userStats,
      transactions: transactionStats,
      activations: activationStats,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
