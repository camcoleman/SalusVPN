"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function WalletBridge() {
  const { connected, publicKey, wallet } = useWallet();

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

  return null;
}
