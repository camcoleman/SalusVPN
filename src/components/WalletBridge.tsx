"use client";

import { useCallback, useEffect, useState } from "react";
import { type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletBridge() {
  const { connected, publicKey, wallet, select, connect, disconnect } =
    useWallet();
  const [pendingWalletName, setPendingWalletName] =
    useState<WalletName | null>(null);

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
    const onExtensionMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window) return;

      const data = event.data;
      if (!data || data.source !== "salusvpn-extension") return;

      if (data.type === "CONNECT_WALLET") {
        const walletName = data.payload?.walletName as WalletName | undefined;
        if (walletName) setPendingWalletName(walletName);
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
    if (!pendingWalletName || !wallet || connected) return;

    let cancelled = false;

    (async () => {
      try {
        await connect();
      } catch (err) {
        console.error("Extension wallet connect failed:", err);
      } finally {
        if (!cancelled) setPendingWalletName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingWalletName, wallet, connected, connect]);

  const scrollToSession = useCallback(() => {
    document.getElementById("session")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (pendingWalletName) scrollToSession();
  }, [pendingWalletName, scrollToSession]);

  return null;
}
