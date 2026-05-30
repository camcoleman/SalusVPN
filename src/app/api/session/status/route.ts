import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessionStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    status: session.status,
    selectedNodeId: session.selectedNodeId,
    settlementStatus: session.settlementStatus,
  });
}
