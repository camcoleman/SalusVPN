"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getUsdcBalance } from "@/lib/settlement";

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function isPhantomInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.solana?.isPhantom);
}

export default function WalletConnect() {
  const { connection } = useConnection();
  const { publicKey, connect, connecting, connected, disconnect } =
    useWallet();
  const [phantomInstalled, setPhantomInstalled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  useEffect(() => {
    setPhantomInstalled(isPhantomInstalled());
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUsdcBalance(null);
      return;
    }

    let cancelled = false;

    async function loadBalance() {
      const balance = await getUsdcBalance(connection, publicKey!);
      if (!cancelled) setUsdcBalance(balance);
    }

    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection]);

  const handleConnect = useCallback(async () => {
    setError(null);

    if (!isPhantomInstalled()) {
      setPhantomInstalled(false);
      return;
    }

    try {
      await connect();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to connect wallet. Please try again.";
      setError(message);
    }
  }, [connect]);

  if (!phantomInstalled) {
    return (
      <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/10 p-3">
        <p className="text-sm text-accent-amber">
          Phantom wallet is not installed.
        </p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Install Phantom
        </a>
      </div>
    );
  }

  if (connected && publicKey) {
    return (
      <div className="rounded-lg border border-border bg-background/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-accent-green">
              Wallet connected
            </p>
            <p className="truncate font-mono text-sm">
              {shortenAddress(publicKey.toBase58())}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            Solana Devnet
          </span>
        </div>
        {usdcBalance !== null && (
          <p className="mt-2 text-xs text-muted">
            Devnet USDC:{" "}
            <span className="font-medium text-foreground">
              {usdcBalance.toFixed(4)}
            </span>
          </p>
        )}
        <p className="mt-1 text-xs text-muted">
          Need devnet USDC? Use the{" "}
          <a
            href="https://spl-token-faucet.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            SPL token faucet
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => disconnect()}
          className="mt-2 text-xs text-muted transition-colors hover:text-foreground"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting ? "Connecting..." : "Connect Phantom"}
      </button>
      {error && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 p-2">
          <p className="text-xs text-accent-red">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 text-xs text-muted hover:text-foreground"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
