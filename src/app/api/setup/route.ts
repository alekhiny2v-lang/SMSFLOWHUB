import { NextResponse } from "next/server";
import { ensureAdmin, ADMIN_PASSWORD } from "@/lib/bootstrap";

export async function GET() {
  try {
    const result = await ensureAdmin();

    if (result.created) {
      return NextResponse.json({ message: "Admin created", username: result.username, password: ADMIN_PASSWORD });
    }
    return NextResponse.json({ message: "Already initialized" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
