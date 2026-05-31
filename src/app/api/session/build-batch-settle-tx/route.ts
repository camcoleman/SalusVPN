import { NextResponse } from "next/server";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getSession } from "@/lib/sessionStore";
import {
  buildBatchSettlementTransaction,
  calculateBatchAccruedAmount,
  serializeSettlementTransaction,
} from "@/lib/settlement";

interface BuildBatchSettleTxRequest {
  sessionIds?: string[];
  walletPublicKey?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BuildBatchSettleTxRequest;

    if (
      !body.sessionIds?.length ||
      !body.walletPublicKey
    ) {
      return NextResponse.json(
        { error: "Missing sessionIds or walletPublicKey" },
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

    const validatedIds: string[] = [];

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
        session.walletPublicKey &&
        session.walletPublicKey !== body.walletPublicKey
      ) {
        return NextResponse.json(
          { error: `Session ${sessionId} belongs to a different wallet` },
          { status: 409 }
        );
      }
      validatedIds.push(sessionId);
    }

    const validatedSessions = validatedIds.map(
      (sessionId) => getSession(sessionId)!
    );
    const amountMicroUsdc = calculateBatchAccruedAmount(
      validatedSessions.map((session) => session.accruedCostUSDC)
    );
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    const { transaction, blockhash, lastValidBlockHeight } =
      await buildBatchSettlementTransaction(
        connection,
        walletPublicKey,
        amountMicroUsdc
      );

    return NextResponse.json({
      transaction: serializeSettlementTransaction(transaction),
      blockhash,
      lastValidBlockHeight,
      cluster: "devnet",
      sessionIds: validatedIds,
      sessionCount: validatedIds.length,
      totalAmountUSDC: amountMicroUsdc / 1_000_000,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to build batch settlement tx";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
