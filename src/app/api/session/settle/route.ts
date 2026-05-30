import { NextResponse } from "next/server";
import { getSession, updateSettlement } from "@/lib/sessionStore";
import type { SettlementStatus } from "@/lib/session";

interface SettleSessionRequest {
  sessionId?: string;
  settlementStatus?: SettlementStatus;
  transactionSignature?: string;
}

const validSettlementStatuses: SettlementStatus[] = [
  "settled",
  "simulated",
  "failed",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SettleSessionRequest;

    if (
      !body.sessionId ||
      !body.settlementStatus ||
      !validSettlementStatuses.includes(body.settlementStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid settlement payload" },
        { status: 400 }
      );
    }

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status !== "ended") {
      return NextResponse.json(
        { error: "Session must be ended before settlement" },
        { status: 409 }
      );
    }

    const updated = updateSettlement(
      body.sessionId,
      body.settlementStatus,
      body.transactionSignature
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to record settlement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: updated.sessionId,
      settlementStatus: updated.settlementStatus,
      transactionSignature: updated.transactionSignature,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to record settlement" },
      { status: 500 }
    );
  }
}
