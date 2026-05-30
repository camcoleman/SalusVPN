import { NextResponse } from "next/server";
import { relayNodes } from "@/data/relayNodes";
import {
  createAndStoreSession,
  getActiveSessionForNode,
} from "@/lib/sessionStore";

const validNodeIds = new Set(relayNodes.map((node) => node.id));

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { selectedNodeId?: string };

    if (!body.selectedNodeId || !validNodeIds.has(body.selectedNodeId)) {
      return NextResponse.json(
        { error: "Invalid or missing selectedNodeId" },
        { status: 400 }
      );
    }

    const existing = getActiveSessionForNode(body.selectedNodeId);
    if (existing) {
      return NextResponse.json(
        { error: "An active session already exists for this node" },
        { status: 409 }
      );
    }

    const session = createAndStoreSession(body.selectedNodeId);

    return NextResponse.json(
      {
        sessionId: session.sessionId,
        selectedNodeId: session.selectedNodeId,
        status: session.status,
        startedAt: session.startedAt,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}
