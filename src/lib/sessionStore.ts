import { createSession, type Session } from "@/lib/session";

const globalForSessions = globalThis as typeof globalThis & {
  salusSessionStore?: Map<string, Session>;
};

const sessions =
  globalForSessions.salusSessionStore ??
  (globalForSessions.salusSessionStore = new Map<string, Session>());

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function saveSession(session: Session): void {
  sessions.set(session.sessionId, session);
}

export function getActiveSessionForNode(nodeId: string): Session | undefined {
  for (const session of sessions.values()) {
    if (session.selectedNodeId === nodeId && session.status === "active") {
      return session;
    }
  }
  return undefined;
}

export function createAndStoreSession(nodeId: string): Session {
  const session = createSession(nodeId);
  sessions.set(session.sessionId, session);
  return session;
}

export function endSession(
  sessionId: string,
  bandwidthUsedMB: number,
  accruedCostUSDC: number
): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const updated: Session = {
    ...session,
    status: "ended",
    endedAt: new Date().toISOString(),
    bandwidthUsedMB,
    accruedCostUSDC,
    settlementStatus: "pending",
  };

  sessions.set(sessionId, updated);
  return updated;
}

export function updateSettlement(
  sessionId: string,
  settlementStatus: Session["settlementStatus"],
  transactionSignature?: string
): Session | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const updated: Session = {
    ...session,
    settlementStatus,
    transactionSignature,
  };

  sessions.set(sessionId, updated);
  return updated;
}

export function getSessionHistory(limit = 10): Session[] {
  return Array.from(sessions.values())
    .filter((session) => session.status === "ended")
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""))
    .slice(0, limit);
}
