"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletBridge() {
  const { connected, publicKey, wallet, select, connect, disconnect } =
    useWallet();
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);
  const connectStartedRef = useRef(false);

  useEffect(() => {
    window.postMessage(
      {
        source: "salusvpn-dashboard",
        type: "WALLET_STATE",
        payload: {
          connected,
          publicKey: publicKey?.toBase58() ?? null,
          walletName: wallet?.adapter.name ?? null,
        },
      },
      window.location.origin
    );
  }, [connected, publicKey, wallet]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const walletFromUrl = params.get("wallet");
    if (walletFromUrl) {
      setPendingWalletName(walletFromUrl as WalletName);
    }
  }, []);

  useEffect(() => {
    const onExtensionMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window) return;

      const data = event.data;
      if (!data || data.source !== "salusvpn-extension") return;

      if (data.type === "CONNECT_WALLET") {
        const walletName = data.payload?.walletName as WalletName | undefined;
        if (walletName) {
          connectStartedRef.current = false;
          setPendingWalletName(walletName);
        }
      }

      if (data.type === "DISCONNECT_WALLET") {
        void disconnect();
      }
    };

    window.addEventListener("message", onExtensionMessage);
    return () => window.removeEventListener("message", onExtensionMessage);
  }, [disconnect]);

  useEffect(() => {
    if (!pendingWalletName) return;
    if (wallet?.adapter.name !== pendingWalletName) {
      select(pendingWalletName);
    }
  }, [pendingWalletName, wallet, select]);

  useEffect(() => {
    if (!pendingWalletName || !wallet || connected || connectStartedRef.current) {
      return;
    }

    connectStartedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await connect();
      } catch (err) {
        console.error("Wallet connect failed:", err);
        connectStartedRef.current = false;
      } finally {
        if (!cancelled) setPendingWalletName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingWalletName, wallet, connected, connect]);

  const closeConnectTabIfNeeded = useCallback(() => {
    if (window.location.pathname !== "/connect") return;
    window.postMessage(
      {
        source: "salusvpn-dashboard",
        type: "CONNECT_COMPLETE",
        payload: { connected: true },
      },
      window.location.origin
    );
  }, []);

  useEffect(() => {
    if (connected) closeConnectTabIfNeeded();
  }, [connected, closeConnectTabIfNeeded]);

  return null;
}
