import { NextResponse } from "next/server";
import { relayNodes } from "@/data/relayNodes";
import { getPendingSettlementSessions } from "@/lib/sessionStore";
import { SETTLEMENT_USDC_AMOUNT } from "@/lib/settlement";

const nodeNames = new Map(relayNodes.map((node) => [node.id, node.name]));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletPublicKey = searchParams.get("walletPublicKey") ?? undefined;

  const sessions = getPendingSettlementSessions(walletPublicKey).map(
    (session) => ({
      sessionId: session.sessionId,
      selectedNodeId: session.selectedNodeId,
      nodeName: nodeNames.get(session.selectedNodeId) ?? session.selectedNodeId,
      endedAt: session.endedAt,
      accruedCostUSDC: session.accruedCostUSDC,
      settlementAmountUSDC: SETTLEMENT_USDC_AMOUNT / 1_000_000,
    })
  );

  const totalAmountUSDC =
    (sessions.length * SETTLEMENT_USDC_AMOUNT) / 1_000_000;

  return NextResponse.json({
    sessions,
    count: sessions.length,
    totalAmountUSDC,
  });
}
