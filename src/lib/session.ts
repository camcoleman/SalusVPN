export type SessionStatus = "idle" | "active" | "ended";

export type SettlementStatus =
  | "none"
  | "pending"
  | "settled"
  | "simulated"
  | "failed";

export type Session = {
  sessionId: string;
  selectedNodeId: string;
  status: SessionStatus;
  startedAt?: string;
  endedAt?: string;
  bandwidthUsedMB: number;
  accruedCostUSDC: number;
  settlementStatus: SettlementStatus;
  transactionSignature?: string;
};

export function createSession(selectedNodeId: string): Session {
  return {
    sessionId: crypto.randomUUID(),
    selectedNodeId,
    status: "active",
    startedAt: new Date().toISOString(),
    bandwidthUsedMB: 0,
    accruedCostUSDC: 0,
    settlementStatus: "none",
  };
}

export function formatTime(elapsedSeconds: number): string {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function calculateBandwidth(elapsedSeconds: number): number {
  return elapsedSeconds * 1.5;
}

export function calculateCost(
  bandwidthMB: number,
  pricePerSession: number,
  elapsedSeconds: number
): number {
  const baseCost = (pricePerSession * elapsedSeconds) / 60;
  const bandwidthCost = (bandwidthMB / 100) * 0.01;
  return baseCost + bandwidthCost;
}
