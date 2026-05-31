import { NextResponse } from "next/server";
import { getSession, settleBatch } from "@/lib/sessionStore";

interface SettleBatchRequest {
  sessionIds?: string[];
  transactionSignature?: string;
  walletPublicKey?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SettleBatchRequest;

    if (
      !body.sessionIds?.length ||
      !body.transactionSignature
    ) {
      return NextResponse.json(
        { error: "Missing sessionIds or transactionSignature" },
        { status: 400 }
      );
    }

    for (const sessionId of body.sessionIds) {
      const session = getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { error: `Session not found: ${sessionId}` },
          { status: 404 }
        );
      }
      if (session.status !== "ended") {
        return NextResponse.json(
          { error: `Session ${sessionId} must be ended before settlement` },
          { status: 409 }
        );
      }
      if (session.settlementStatus !== "pending") {
        return NextResponse.json(
          { error: `Session ${sessionId} is not pending settlement` },
          { status: 409 }
        );
      }
      if (
        body.walletPublicKey &&
        session.walletPublicKey &&
        session.walletPublicKey !== body.walletPublicKey
      ) {
        return NextResponse.json(
          { error: `Session ${sessionId} belongs to a different wallet` },
          { status: 409 }
        );
      }
    }

    const settled = settleBatch(body.sessionIds, body.transactionSignature);

    if (settled.length !== body.sessionIds.length) {
      return NextResponse.json(
        { error: "Failed to record batch settlement" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionIds: settled.map((s) => s.sessionId),
      settlementStatus: "settled",
      transactionSignature: body.transactionSignature,
      batchId: settled[0]?.batchId,
      count: settled.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to record batch settlement" },
      { status: 500 }
    );
  }
}
