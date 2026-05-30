"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { getUsdcBalance } from "@/lib/settlement";

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const PHANTOM_WALLET_NAME = "Phantom" as WalletName;

function getPhantomProvider() {
  if (typeof window === "undefined") return null;
  const provider = window.solana;
  return provider?.isPhantom ? provider : null;
}

export default function WalletConnect() {
  const { connection } = useConnection();
  const {
    publicKey,
    connect,
    connecting,
    connected,
    disconnect,
    select,
    wallets,
    wallet,
  } = useWallet();
  const [phantomInstalled, setPhantomInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [pendingConnect, setPendingConnect] = useState(false);

  useEffect(() => {
    const checkPhantom = () => setPhantomInstalled(Boolean(getPhantomProvider()));

    checkPhantom();
    window.addEventListener("load", checkPhantom);

    const interval = setInterval(checkPhantom, 500);
    const timeout = setTimeout(() => clearInterval(interval), 3000);

    return () => {
      window.removeEventListener("load", checkPhantom);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!pendingConnect || !wallet || connected) return;

    let cancelled = false;

    (async () => {
      try {
        await connect();
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Failed to connect wallet. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setPendingConnect(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingConnect, wallet, connected, connect]);

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

    const phantomProvider = getPhantomProvider();
    if (!phantomProvider) {
      setPhantomInstalled(false);
      setError("Phantom wallet is not installed.");
      return;
    }

    const phantomWallet = wallets.find((w) => w.adapter.name === "Phantom");
    if (!phantomWallet) {
      setError("Phantom adapter is not ready. Refresh and try again.");
      return;
    }

    const isReady =
      phantomWallet.readyState === WalletReadyState.Installed ||
      phantomWallet.readyState === WalletReadyState.Loadable;

    if (!isReady) {
      try {
        select(PHANTOM_WALLET_NAME);
        await phantomProvider.connect!();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to connect Phantom."
        );
      }
      return;
    }

    if (wallet?.adapter.name !== "Phantom") {
      select(PHANTOM_WALLET_NAME);
    }

    setPendingConnect(true);
  }, [wallets, wallet, select]);

  const isBusy = connecting || pendingConnect;

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
        disabled={isBusy}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? "Connecting..." : "Connect Phantom"}
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
