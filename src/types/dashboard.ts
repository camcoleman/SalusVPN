export interface SessionRecord {
  sessionId: string;
  selectedNodeId: string;
  nodeName: string;
  endedAt?: string;
  bandwidthUsedMB: number;
  accruedCostUSDC: number;
  settlementStatus: string;
  transactionSignature?: string;
}

export interface PaymentRecord {
  sessionId: string;
  nodeName: string;
  amountUSDC: number;
  settlementStatus: string;
  transactionSignature?: string;
  endedAt?: string;
}

export type DashboardSection =
  | "marketplace"
  | "metrics"
  | "trust"
  | "verification"
  | "sessions"
  | "payments";
