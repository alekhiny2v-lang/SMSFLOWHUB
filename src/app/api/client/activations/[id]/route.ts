import { NextRequest, NextResponse } from "next/server";
import { eq } from "@/db/query";
import { db } from "@/db";
import { activations, countries, users, transactions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { getStatus, setStatus, parseStatusResponse } from "@/lib/smsbower";

const TIMEOUT_MINUTES = 20;

async function refundActivation(activationId: number, userId: number, note: string) {
  await db.transaction(async (tx) => {
    const [activation] = await tx.select().from(activations).where(eq(activations.id, activationId));
    if (!activation || activation.status !== "pending" || activation.smsCode) return;

    const [user] = await tx.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
    if (!user) return;

    const refundAmount = Number(activation.salePrice);
    const newBalance = Number(user.balance) + refundAmount;

    await tx
      .update(users)
      .set({ balance: String(newBalance.toFixed(4)), updatedAt: new Date() })
      .where(eq(users.id, userId));

    await tx.insert(transactions).values({
      userId,
      type: "refund",
      amount: String(refundAmount.toFixed(4)),
      status: "completed",
      method: "balance",
      notes: note,
    });

    await tx
      .update(activations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(activations.id, activationId));
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const activationId = Number(id);

    const rows = await db
      .select({
        id: activations.id,
        userId: activations.userId,
        countryId: activations.countryId,
        countryName: countries.name,
        countryCode: countries.code,
        smsbowerActivationId: activations.smsbowerActivationId,
        service: activations.service,
        phoneNumber: activations.phoneNumber,
        salePrice: activations.salePrice,
        cost: activations.cost,
        status: activations.status,
        smsCode: activations.smsCode,
        smsText: activations.smsText,
        createdAt: activations.createdAt,
        updatedAt: activations.updatedAt,
      })
      .from(activations)
      .leftJoin(countries, eq(activations.countryId, countries.id))
      .where(eq(activations.id, activationId));

    let activation = rows[0];
    if (!activation || activation.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Auto refund if pending for more than timeout and no OTP received
    if (
      activation.status === "pending" &&
      !activation.smsCode &&
      activation.createdAt &&
      Date.now() - new Date(activation.createdAt).getTime() > TIMEOUT_MINUTES * 60 * 1000
    ) {
      await refundActivation(activationId, user.id, `Auto refund: OTP not received within ${TIMEOUT_MINUTES} minutes`);
      const refreshed = await db
        .select({
          id: activations.id,
          userId: activations.userId,
          countryId: activations.countryId,
          countryName: countries.name,
          countryCode: countries.code,
          smsbowerActivationId: activations.smsbowerActivationId,
          service: activations.service,
          phoneNumber: activations.phoneNumber,
          salePrice: activations.salePrice,
          cost: activations.cost,
          status: activations.status,
          smsCode: activations.smsCode,
          smsText: activations.smsText,
          createdAt: activations.createdAt,
          updatedAt: activations.updatedAt,
        })
        .from(activations)
        .leftJoin(countries, eq(activations.countryId, countries.id))
        .where(eq(activations.id, activationId));
      activation = refreshed[0]!;
    }

    const statusText = await getStatus(activation.smsbowerActivationId);
    const parsed = parseStatusResponse(statusText);

    let smsCode = activation.smsCode;
    let smsText = activation.smsText;
    let activationStatus = activation.status;

    if (parsed.status === "STATUS_OK" && parsed.code) {
      smsCode = parsed.code;
      activationStatus = "completed";
    } else if (parsed.status === "STATUS_CANCEL") {
      activationStatus = "cancelled";
    } else if (parsed.status === "STATUS_WAIT_RETRY" && parsed.code) {
      smsCode = parsed.code;
    }

    if (
      smsCode !== activation.smsCode ||
      smsText !== activation.smsText ||
      activationStatus !== activation.status
    ) {
      await db
        .update(activations)
        .set({ smsCode, smsText, status: activationStatus, updatedAt: new Date() })
        .where(eq(activations.id, activationId));
    }

    const canCancel = activationStatus === "pending" && !smsCode;

    return NextResponse.json({
      ...activation,
      rawStatus: parsed.status,
      smsCode,
      status: activationStatus,
      canCancel,
      timeRemainingMs: canCancel
        ? Math.max(0, TIMEOUT_MINUTES * 60 * 1000 - (Date.now() - new Date(activation.createdAt).getTime()))
        : 0,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const activationId = Number(id);
    const body = await req.json();
    const { action } = body;

    const rows = await db.select().from(activations).where(eq(activations.id, activationId));
    const activation = rows[0];
    if (!activation || activation.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "cancel") {
      if (activation.status !== "pending" || activation.smsCode) {
        return NextResponse.json({ error: "Cannot cancel this activation" }, { status: 400 });
      }
      await refundActivation(activationId, user.id, `Cancelled by user: ${activation.phoneNumber}`);
      try {
        await setStatus(activation.smsbowerActivationId, 8);
      } catch {
        // Ignore SMSBOWER cancel errors after refund
      }
      return NextResponse.json({ success: true, refunded: true });
    }

    let statusCode = 0;
    if (action === "ready") statusCode = 1;
    else if (action === "retry") statusCode = 3;
    else if (action === "complete") statusCode = 6;
    else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await setStatus(activation.smsbowerActivationId, statusCode);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 401 });
  }
}
