"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { getSolBalance, getUsdcBalance } from "@/lib/settlement";
import { SUPPORTED_WALLET_HINTS } from "@/lib/wallets";

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function isWalletReady(readyState: WalletReadyState): boolean {
  return (
    readyState === WalletReadyState.Installed ||
    readyState === WalletReadyState.Loadable
  );
}

export default function WalletConnect() {
  const { connection } = useConnection();
  const { setVisible: openWalletModal } = useWalletModal();
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

  const [error, setError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);

  const availableWallets = useMemo(
    () => wallets.filter((w) => isWalletReady(w.readyState)),
    [wallets]
  );

  const hasAnyWallet = availableWallets.length > 0;

  useEffect(() => {
    if (!pendingWalletName || !wallet || connected) return;

    let cancelled = false;

    (async () => {
      try {
        await connect();
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect wallet. Please try again."
          );
        }
      } finally {
        if (!cancelled) setPendingWalletName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingWalletName, wallet, connected, connect]);

  useEffect(() => {
    if (!connected || !publicKey) {
      setUsdcBalance(null);
      setSolBalance(null);
      return;
    }

    let cancelled = false;

    async function loadBalance() {
      const [usdc, sol] = await Promise.all([
        getUsdcBalance(connection, publicKey!),
        getSolBalance(connection, publicKey!),
      ]);
      if (!cancelled) {
        setUsdcBalance(usdc);
        setSolBalance(sol);
      }
    }

    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [connected, publicKey, connection]);

  const handleSelectWallet = useCallback(
    (walletName: WalletName) => {
      setError(null);

      if (wallet?.adapter.name !== walletName) {
        select(walletName);
      }

      setPendingWalletName(walletName);
    },
    [wallet, select]
  );

  const isBusy = connecting || pendingWalletName !== null;

  if (connected && publicKey) {
    return (
      <div className="rounded-lg border border-border bg-background/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-accent-green">
              Wallet connected
            </p>
            <p className="truncate text-xs text-muted">
              {wallet?.adapter.name ?? "Wallet"}
            </p>
            <p className="truncate font-mono text-sm">
              {shortenAddress(publicKey.toBase58())}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
            Solana Devnet
          </span>
        </div>
        {solBalance !== null && (
          <p className="mt-2 text-xs text-muted">
            Devnet SOL:{" "}
            <span className="font-medium text-foreground">
              {solBalance.toFixed(4)}
            </span>
          </p>
        )}
        {usdcBalance !== null && (
          <p className="mt-1 text-xs text-muted">
            Devnet USDC:{" "}
            <span className="font-medium text-foreground">
              {usdcBalance.toFixed(4)}
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          Use{" "}
          <a
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            faucet.solana.com
          </a>{" "}
          for devnet SOL and{" "}
          <a
            href="https://spl-token-faucet.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-2 hover:underline"
          >
            spl-token-faucet.com
          </a>{" "}
          for devnet USDC. Testnet funds will not work.
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
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Switch your wallet to <strong>Solana Devnet</strong> before connecting.
        Connect with Phantom, MetaMask, Solflare, or other Solana wallets.
      </p>

      {hasAnyWallet ? (
        <div className="grid gap-2">
          {availableWallets.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              onClick={() => handleSelectWallet(w.adapter.name)}
              disabled={isBusy}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-accent/40 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
            >
              {w.adapter.icon && (
                <img
                  src={w.adapter.icon}
                  alt=""
                  className="h-6 w-6 rounded-md"
                />
              )}
              <span>{w.adapter.name}</span>
              {w.readyState === WalletReadyState.Loadable && (
                <span className="ml-auto text-xs text-muted">Install</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/10 p-3">
          <p className="text-sm text-accent-amber">
            No Solana wallet detected in this browser.
          </p>
          <p className="mt-1 text-xs text-muted">
            Install{" "}
            {SUPPORTED_WALLET_HINTS.slice(0, 3).join(", ")}, or another
            supported wallet, then refresh.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setError(null);
          openWalletModal(true);
        }}
        disabled={isBusy}
        className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent/40 hover:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? "Connecting..." : "Browse all wallets"}
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
