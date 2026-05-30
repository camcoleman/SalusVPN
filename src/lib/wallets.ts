import type { Adapter } from "@solana/wallet-adapter-base";
import {
  CoinbaseWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TrustWalletAdapter,
} from "@solana/wallet-adapter-wallets";

/**
 * Explicit wallet adapters. Wallet Standard wallets (MetaMask, Backpack, etc.)
 * are auto-detected by WalletProvider via useStandardWalletAdapters.
 */
export function getWalletAdapters(): Adapter[] {
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new TrustWalletAdapter(),
  ];
}

export const SUPPORTED_WALLET_HINTS = [
  "Phantom",
  "MetaMask",
  "Solflare",
  "Coinbase Wallet",
  "Trust",
  "Backpack",
];
