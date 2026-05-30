/// <reference types="@solana/wallet-adapter-react" />

export {};

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect?: () => Promise<{ publicKey: { toString: () => string } }>;
    };
  }
}
