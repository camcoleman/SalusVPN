"use client";

import { useCallback, useEffect, useState } from "react";
import { getDevnetExplorerUrl } from "@/lib/settlement";

interface HistorySession {
  sessionId: string;
  selectedNodeId: string;
  nodeName: string;
  endedAt?: string;
  bandwidthUsedMB: number;
  accruedCostUSDC: number;
  settlementStatus: string;
  transactionSignature?: string;
}

export default function SessionHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/session/history");
      if (!response.ok) return;
      const data = (await response.json()) as { sessions: HistorySession[] };
      setSessions(data.sessions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();

    const handleUpdate = () => loadHistory();
    window.addEventListener("session-updated", handleUpdate);
    return () => window.removeEventListener("session-updated", handleUpdate);
  }, [loadHistory]);

  return (
    <aside className="rounded-xl border border-border bg-surface-elevated p-5">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted">
        Session History
      </h2>

      {loading && (
        <p className="mt-3 text-xs text-muted">Loading history...</p>
      )}

      {!loading && sessions.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          No completed sessions yet.
        </p>
      )}

      <ul className="mt-3 space-y-3">
        {sessions.map((session) => (
          <li
            key={session.sessionId}
            className="rounded-lg border border-border bg-background/50 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{session.nodeName}</span>
              <span className="capitalize text-muted">
                {session.settlementStatus}
              </span>
            </div>
            <p className="mt-1 text-muted">
              ${session.accruedCostUSDC.toFixed(4)} USDC ·{" "}
              {session.bandwidthUsedMB.toFixed(1)} MB
            </p>
            {session.transactionSignature && (
              <a
                href={getDevnetExplorerUrl(session.transactionSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-accent underline-offset-2 hover:underline"
              >
                View prototype tx
              </a>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
