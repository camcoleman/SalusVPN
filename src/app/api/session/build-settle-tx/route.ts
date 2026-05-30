import { NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getSession } from "@/lib/sessionStore";
import {
  buildSettlementTransaction,
  serializeSettlementTransaction,
} from "@/lib/settlement";

interface BuildSettleTxRequest {
  sessionId?: string;
  walletPublicKey?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BuildSettleTxRequest;

    if (!body.sessionId || !body.walletPublicKey) {
      return NextResponse.json(
        { error: "Missing sessionId or walletPublicKey" },
        { status: 400 }
      );
    }

    let walletPublicKey: PublicKey;
    try {
      walletPublicKey = new PublicKey(body.walletPublicKey);
    } catch {
      return NextResponse.json(
        { error: "Invalid walletPublicKey" },
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

    if (session.settlementStatus !== "pending") {
      return NextResponse.json(
        { error: "Session is not pending settlement" },
        { status: 409 }
      );
    }

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const { transaction, blockhash, lastValidBlockHeight } =
      await buildSettlementTransaction(connection, walletPublicKey);

    return NextResponse.json({
      transaction: serializeSettlementTransaction(transaction),
      blockhash,
      lastValidBlockHeight,
      cluster: "devnet",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to build settlement tx";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
