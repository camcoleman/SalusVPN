"use client";

import { useCallback, useEffect, useState } from "react";
import { getDevnetExplorerUrl } from "@/lib/settlement";
import { sessionsToPaymentRecords } from "@/lib/paymentHistory";
import type { PaymentRecord, SessionRecord } from "@/types/dashboard";

export default function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    try {
      const response = await fetch("/api/session/history");
      if (!response.ok) return;
      const data = (await response.json()) as { sessions: SessionRecord[] };
      setPayments(sessionsToPaymentRecords(data.sessions));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();

    const handleUpdate = () => loadPayments();
    window.addEventListener("session-updated", handleUpdate);
    return () => window.removeEventListener("session-updated", handleUpdate);
  }, [loadPayments]);

  return (
    <aside className="rounded-xl border border-border bg-surface-elevated p-5">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted">
        Payment History
      </h2>
      <p className="mt-1 text-xs text-muted">
        USDC settlements from completed relay sessions.
      </p>

      {loading && (
        <p className="mt-3 text-xs text-muted">Loading payments...</p>
      )}

      {!loading && payments.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          No settled payments yet. End a session to record a payment.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {payments.map((payment) => (
          <li
            key={payment.sessionId}
            className="rounded-lg border border-border bg-background/50 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{payment.nodeName}</span>
              <span className="font-semibold tabular-nums text-accent-green">
                ${payment.amountUSDC.toFixed(4)} USDC
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-muted">
              <span className="capitalize">{payment.settlementStatus}</span>
              {payment.endedAt && (
                <span>{new Date(payment.endedAt).toLocaleString()}</span>
              )}
            </div>
            {payment.transactionSignature && (
              <a
                href={getDevnetExplorerUrl(payment.transactionSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-accent underline-offset-2 hover:underline"
              >
                View transaction
              </a>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
