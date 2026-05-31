import { NextResponse } from "next/server";
import { endSession, getSession } from "@/lib/sessionStore";

interface EndSessionRequest {
  sessionId?: string;
  selectedNodeId?: string;
  bandwidthUsedMB?: number;
  accruedCostUSDC?: number;
  walletPublicKey?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EndSessionRequest;

    if (
      !body.sessionId ||
      !body.selectedNodeId ||
      typeof body.bandwidthUsedMB !== "number" ||
      typeof body.accruedCostUSDC !== "number"
    ) {
      return NextResponse.json(
        { error: "Missing or invalid session end payload" },
        { status: 400 }
      );
    }

    const session = getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.selectedNodeId !== body.selectedNodeId) {
      return NextResponse.json(
        { error: "Session does not match selected node" },
        { status: 400 }
      );
    }

    if (session.status === "ended") {
      return NextResponse.json(
        { error: "Session has already ended" },
        { status: 409 }
      );
    }

    const ended = endSession(
      body.sessionId,
      body.bandwidthUsedMB,
      body.accruedCostUSDC,
      body.walletPublicKey
    );

    if (!ended) {
      return NextResponse.json(
        { error: "Failed to end session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ended",
      totalBandwidthMB: ended.bandwidthUsedMB,
      totalCostUSDC: ended.accruedCostUSDC,
      settlementStatus: ended.settlementStatus,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}
