import { NextResponse } from "next/server";
import { relayNodes } from "@/data/relayNodes";
import { getSessionHistory } from "@/lib/sessionStore";

const nodeNames = new Map(relayNodes.map((node) => [node.id, node.name]));

export async function GET() {
  const sessions = getSessionHistory(5).map((session) => ({
    sessionId: session.sessionId,
    selectedNodeId: session.selectedNodeId,
    nodeName: nodeNames.get(session.selectedNodeId) ?? session.selectedNodeId,
    endedAt: session.endedAt,
    bandwidthUsedMB: session.bandwidthUsedMB,
    accruedCostUSDC: session.accruedCostUSDC,
    settlementStatus: session.settlementStatus,
    transactionSignature: session.transactionSignature,
  }));

  return NextResponse.json({ sessions });
}
