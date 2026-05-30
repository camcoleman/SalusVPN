import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

/** Circle devnet USDC mint */
export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

/** Prototype treasury wallet (devnet). Replace with team wallet for production demos. */
export const SETTLEMENT_TREASURY = new PublicKey(
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
);

/** 0.001 USDC (6 decimals) */
export const SETTLEMENT_USDC_AMOUNT = 1000;

export type SettlementResult = {
  status: "settled" | "simulated" | "failed";
  signature?: string;
};

export async function getUsdcBalance(
  connection: Connection,
  owner: PublicKey
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(DEVNET_USDC_MINT, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount) / 1_000_000;
  } catch {
    return 0;
  }
}

export async function attemptPrototypeSettlement(
  connection: Connection,
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<string>
): Promise<SettlementResult> {
  try {
    const sourceAta = await getAssociatedTokenAddress(
      DEVNET_USDC_MINT,
      publicKey
    );

    let sourceAccount;
    try {
      sourceAccount = await getAccount(connection, sourceAta);
    } catch {
      return { status: "simulated" };
    }

    if (sourceAccount.amount < SETTLEMENT_USDC_AMOUNT) {
      return { status: "simulated" };
    }

    const destinationAta = await getAssociatedTokenAddress(
      DEVNET_USDC_MINT,
      SETTLEMENT_TREASURY
    );

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: publicKey,
      blockhash,
      lastValidBlockHeight,
    });

    try {
      await getAccount(connection, destinationAta);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          publicKey,
          destinationAta,
          SETTLEMENT_TREASURY,
          DEVNET_USDC_MINT
        )
      );
    }

    transaction.add(
      createTransferInstruction(
        sourceAta,
        destinationAta,
        publicKey,
        SETTLEMENT_USDC_AMOUNT
      )
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
