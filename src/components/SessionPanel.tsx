"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { RelayNode } from "@/data/relayNodes";
import WalletConnect from "@/components/WalletConnect";
import {
  calculateBandwidth,
  calculateCost,
  formatTime,
  type SessionStatus,
  type SettlementStatus,
} from "@/lib/session";
import {
  attemptPrototypeSettlement,
  getDevnetExplorerUrl,
} from "@/lib/settlement";

interface SessionPanelProps {
  selectedNode: RelayNode | null;
}

interface PendingSettlementSession {
  sessionId: string;
  nodeName: string;
  accruedCostUSDC: number;
}

interface SessionFieldProps {
  label: string;
  value: React.ReactNode;
}

function SessionField({ label, value }: SessionFieldProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const styles: Record<SessionStatus, string> = {
    idle: "bg-surface text-muted",
    active: "bg-accent-green/10 text-accent-green",
    ended: "bg-accent-amber/10 text-accent-amber",
  };

  const labels: Record<SessionStatus, string> = {
    idle: "Idle",
    active: "Active",
    ended: "Ended",
  };

  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function SessionPanel({ selectedNode }: SessionPanelProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bandwidthUsedMB, setBandwidthUsedMB] = useState(0);
  const [accruedCostUSDC, setAccruedCostUSDC] = useState(0);
  const [settlementStatus, setSettlementStatus] =
    useState<SettlementStatus>("none");
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null);
  const [settlementMessage, setSettlementMessage] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSettlement, setPendingSettlement] =
    useState<PendingSettlementSession | null>(null);
  const [settlingPending, setSettlingPending] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  const loadPendingSettlement = useCallback(async () => {
    try {
      const response = await fetch("/api/session/history");
      if (!response.ok) return;

      const data = (await response.json()) as {
        sessions: Array<{
          sessionId: string;
          nodeName: string;
          accruedCostUSDC: number;
          settlementStatus: SettlementStatus;
        }>;
      };

      const pending = data.sessions.find(
        (session) => session.settlementStatus === "pending"
      );

      if (pending) {
        setPendingSettlement({
          sessionId: pending.sessionId,
          nodeName: pending.nodeName,
          accruedCostUSDC: pending.accruedCostUSDC,
        });
      } else {
        setPendingSettlement(null);
      }
    } catch {
      // ignore fetch errors for optional banner
    }
  }, []);

  useEffect(() => {
    void loadPendingSettlement();

    const handleUpdate = () => {
      void loadPendingSettlement();
    };

    window.addEventListener("session-updated", handleUpdate);
    return () => window.removeEventListener("session-updated", handleUpdate);
  }, [loadPendingSettlement]);

  const settlePendingSession = useCallback(async () => {
    if (!pendingSettlement || !connected || !publicKey || !sendTransaction) {
      setError("Connect your wallet to complete settlement.");
      return;
    }

    setSettlingPending(true);
    setError(null);

    try {
      const result = await attemptPrototypeSettlement(
        connection,
        publicKey,
        sendTransaction
      );

      if (result.status === "failed") {
        setError(result.error ?? "Settlement failed.");
        return;
      }

      const finalSettlementStatus: SettlementStatus =
        result.status === "settled" && result.signature ? "settled" : "simulated";

      await fetch("/api/session/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: pendingSettlement.sessionId,
          settlementStatus: finalSettlementStatus,
          transactionSignature: result.signature,
        }),
      });

      setPendingSettlement(null);
      setSettlementMessage(
        finalSettlementStatus === "settled"
          ? "Extension session settled on-chain."
          : "Extension session settlement simulated."
      );
      window.dispatchEvent(new CustomEvent("session-updated"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to settle extension session"
      );
    } finally {
      setSettlingPending(false);
    }
  }, [
    pendingSettlement,
    connected,
    publicKey,
    sendTransaction,
    connection,
  ]);

  const resetSession = useCallback(() => {
    clearTick();
    setSessionId(null);
    setStatus("idle");
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    setBandwidthUsedMB(0);
    setAccruedCostUSDC(0);
    setSettlementStatus("none");
    setTransactionSignature(null);
    setSettlementMessage(null);
    setError(null);
  }, [clearTick]);

  const startSession = useCallback(async () => {
    if (!selectedNode || status === "active") return;

    setLoading(true);
    setError(null);
    setSettlementMessage(null);
    setTransactionSignature(null);
    setSettlementStatus("none");

    try {
      const response = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedNodeId: selectedNode.id }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to start session");
      }

      const data = (await response.json()) as { sessionId: string };
      setSessionId(data.sessionId);
      setStatus("active");
      setElapsedSeconds(0);
      elapsedRef.current = 0;
      setBandwidthUsedMB(0);
      setAccruedCostUSDC(0);

      clearTick();
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        const elapsed = elapsedRef.current;
        const bandwidth = calculateBandwidth(elapsed);
        const cost = calculateCost(
          bandwidth,
          selectedNode.pricePerSession,
          elapsed
        );

        setElapsedSeconds(elapsed);
        setBandwidthUsedMB(bandwidth);
        setAccruedCostUSDC(cost);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session");
    } finally {
      setLoading(false);
    }
  }, [selectedNode, status, clearTick]);

  const endSession = useCallback(async () => {
    if (!selectedNode || !sessionId || status !== "active") return;

    clearTick();
    setLoading(true);
    setError(null);

    const finalBandwidth = bandwidthUsedMB;
    const finalCost = accruedCostUSDC;

    try {
      const response = await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          selectedNodeId: selectedNode.id,
          bandwidthUsedMB: finalBandwidth,
          accruedCostUSDC: finalCost,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to end session");
      }

      setStatus("ended");
      setSettlementStatus("pending");

      let finalSettlementStatus: SettlementStatus = "failed";
      let finalSignature: string | undefined;

      if (connected && publicKey && sendTransaction) {
        const result = await attemptPrototypeSettlement(
          connection,
          publicKey,
          sendTransaction
        );

        if (result.status === "settled" && result.signature) {
          finalSettlementStatus = "settled";
          finalSignature = result.signature;
          setSettlementStatus("settled");
          setTransactionSignature(result.signature);
          setSettlementMessage(
            "Prototype USDC settlement transaction confirmed."
          );
        } else if (result.status === "failed") {
          finalSettlementStatus = "failed";
          setSettlementStatus("failed");
          setSettlementMessage(result.error ?? "Settlement failed.");
          setError(result.error ?? "Settlement failed.");
        } else {
          finalSettlementStatus = "simulated";
          setSettlementStatus("simulated");
          setSettlementMessage("Prototype settlement simulated.");
        }
      } else {
        finalSettlementStatus = "simulated";
        setSettlementStatus("simulated");
        setSettlementMessage("Connect wallet to settle on-chain.");
      }

      if (finalSettlementStatus === "failed") {
        window.dispatchEvent(new CustomEvent("session-updated"));
        return;
      }

      await fetch("/api/session/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          settlementStatus: finalSettlementStatus,
          transactionSignature: finalSignature,
        }),
      });

      window.dispatchEvent(new CustomEvent("session-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session");
      setSettlementStatus("failed");
    } finally {
      setLoading(false);
    }
  }, [
    selectedNode,
    sessionId,
    status,
    bandwidthUsedMB,
    accruedCostUSDC,
    clearTick,
    connected,
    publicKey,
    sendTransaction,
    connection,
  ]);

  const canStart = Boolean(selectedNode) && status !== "active" && !loading;
  const canEnd = status === "active" && !loading;

  return (
    <aside
      id="session"
      className="rounded-xl border border-border bg-surface-elevated p-5 lg:sticky lg:top-24 lg:self-start"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${
              status === "active" ? "animate-ping bg-accent-green" : "bg-muted"
            }`}
          />
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              status === "active" ? "bg-accent-green" : "bg-muted"
            }`}
          />
        </span>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted">
          Session Monitor
        </h2>
      </div>

      <div className="mb-4">
        <WalletConnect />
      </div>

      {pendingSettlement && (
        <div className="mb-4 rounded-lg border border-accent-amber/30 bg-accent-amber/5 p-3">
          <p className="text-xs font-medium text-accent-amber">
            Session ended in extension
          </p>
          <p className="mt-1 text-xs text-muted">
            {pendingSettlement.nodeName} · $
            {pendingSettlement.accruedCostUSDC.toFixed(4)} USDC pending
            settlement
          </p>
          <button
            type="button"
            onClick={settlePendingSession}
            disabled={settlingPending || !connected}
            className="mt-2 w-full rounded-lg bg-accent-amber/10 px-3 py-2 text-xs font-semibold text-accent-amber transition-colors hover:bg-accent-amber/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {settlingPending ? "Settling..." : "Complete settlement"}
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-background/50 p-4 font-mono">
        <SessionField
          label="Selected Relay"
          value={selectedNode?.name ?? "None"}
        />
        <SessionField
          label="Status"
          value={<StatusBadge status={status} />}
        />
        <SessionField
          label="Time Connected"
          value={formatTime(elapsedSeconds)}
        />
        <SessionField
          label="Bandwidth Used"
          value={`${bandwidthUsedMB.toFixed(1)} MB`}
        />
        <SessionField
          label="Cost (USDC)"
          value={`$${accruedCostUSDC.toFixed(4)}`}
        />
        <SessionField
          label="Settlement Status"
          value={
            settlementStatus === "none"
              ? "—"
              : settlementStatus.charAt(0).toUpperCase() +
                settlementStatus.slice(1)
          }
        />
        <SessionField
          label="Transaction Hash"
          value={
            transactionSignature ? (
              <a
                href={getDevnetExplorerUrl(transactionSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline-offset-2 hover:underline"
              >
                {transactionSignature.slice(0, 8)}...
              </a>
            ) : (
              "—"
            )
          }
        />
      </div>

      {settlementMessage && (
        <p className="mt-3 text-xs text-muted">{settlementMessage}</p>
      )}

      {error && (
        <p className="mt-3 text-xs text-accent-red">{error}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={startSession}
          disabled={!canStart}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && status !== "active" ? "Starting..." : "Start Session"}
        </button>
        <button
          type="button"
          onClick={endSession}
          disabled={!canEnd}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/40 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading && status === "active" ? "Ending..." : "End Session"}
        </button>
        {status === "ended" && (
          <button
            type="button"
            onClick={resetSession}
            className="w-full text-xs text-muted transition-colors hover:text-foreground"
          >
            Reset session
          </button>
        )}
      </div>

      {!selectedNode && (
        <p className="mt-4 text-xs text-muted">
          Select a relay node to begin a session.
        </p>
      )}
    </aside>
  );
}
