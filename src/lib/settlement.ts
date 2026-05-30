import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const SETTLEMENT_LAMPORTS = 1000;

export type SettlementResult = {
  status: "settled" | "simulated" | "failed";
  signature?: string;
};

export async function attemptPrototypeSettlement(
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<string>
): Promise<SettlementResult> {
  try {
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey,
        lamports: SETTLEMENT_LAMPORTS,
      })
    );

    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return { status: "settled", signature };
  } catch {
    return { status: "simulated" };
  }
}

export function getDevnetExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
