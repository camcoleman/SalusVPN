import type { PaymentRecord, SessionRecord } from "@/types/dashboard";

export function sessionsToPaymentRecords(
  sessions: SessionRecord[]
): PaymentRecord[] {
  return sessions
    .filter((session) => session.settlementStatus !== "none")
    .map((session) => ({
      sessionId: session.sessionId,
      nodeName: session.nodeName,
      amountUSDC: session.accruedCostUSDC,
      settlementStatus: session.settlementStatus,
      transactionSignature: session.transactionSignature,
      endedAt: session.endedAt,
    }))
    .sort((a, b) => {
      const aTime = a.endedAt ? Date.parse(a.endedAt) : 0;
      const bTime = b.endedAt ? Date.parse(b.endedAt) : 0;
      return bTime - aTime;
    });
}
