"use client";

import { Suspense } from "react";
import WalletConnect from "@/components/WalletConnect";

function ConnectContent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-6 text-center">
        <h1 className="font-mono text-lg font-semibold tracking-wide">
          SalusVPN
        </h1>
        <p className="mt-2 text-sm text-muted">
          Approve the connection in your wallet popup (Phantom, MetaMask, or
          Solflare).
        </p>
      </div>
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface-elevated p-4">
        <WalletConnect />
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted">Loading…</p>
        </main>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
