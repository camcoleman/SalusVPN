import {
  Connection,
  LAMPORTS_PER_SOL,
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

/** Minimum SOL for fees + possible ATA rent on devnet */
export const MIN_SOL_FOR_SETTLEMENT = 0.001;

export type SettlementResult = {
  status: "settled" | "simulated" | "failed";
  signature?: string;
  error?: string;
};

export type SettlementPreflight = {
  ok: boolean;
  error?: string;
  solBalance?: number;
  usdcBalance?: number;
};

export type BuiltSettlementTransaction = {
  transaction: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
};

export async function getSolBalance(
  connection: Connection,
  owner: PublicKey
): Promise<number> {
  const lamports = await connection.getBalance(owner);
  return lamports / LAMPORTS_PER_SOL;
}

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

export async function checkSettlementPreflight(
  connection: Connection,
  publicKey: PublicKey
): Promise<SettlementPreflight> {
  const solBalance = await getSolBalance(connection, publicKey);
  const usdcBalance = await getUsdcBalance(connection, publicKey);

  if (solBalance < MIN_SOL_FOR_SETTLEMENT) {
    return {
      ok: false,
      solBalance,
      usdcBalance,
      error:
        "Need devnet SOL for transaction fees. Get SOL at faucet.solana.com (select Devnet). Testnet funds will not work.",
    };
  }

  if (usdcBalance < SETTLEMENT_USDC_AMOUNT / 1_000_000) {
    return {
      ok: false,
      solBalance,
      usdcBalance,
      error:
        "Need devnet USDC for settlement (0.001 USDC minimum). Use spl-token-faucet.com on Devnet.",
    };
  }

  return { ok: true, solBalance, usdcBalance };
}

export function calculateBatchAmount(sessionCount: number): number {
  if (sessionCount < 1) {
    throw new Error("At least one session is required for batch settlement.");
  }
  return sessionCount * SETTLEMENT_USDC_AMOUNT;
}

export async function checkBatchSettlementPreflight(
  connection: Connection,
  publicKey: PublicKey,
  amountMicroUsdc: number
): Promise<SettlementPreflight> {
  const solBalance = await getSolBalance(connection, publicKey);
  const usdcBalance = await getUsdcBalance(connection, publicKey);
  const requiredUsdc = amountMicroUsdc / 1_000_000;

  if (solBalance < MIN_SOL_FOR_SETTLEMENT) {
    return {
      ok: false,
      solBalance,
      usdcBalance,
      error:
        "Need devnet SOL for transaction fees. Get SOL at faucet.solana.com (select Devnet). Testnet funds will not work.",
    };
  }

  if (usdcBalance < requiredUsdc) {
    return {
      ok: false,
      solBalance,
      usdcBalance,
      error: `Need ${requiredUsdc.toFixed(3)} devnet USDC for this batch. Use spl-token-faucet.com on Devnet.`,
    };
  }

  return { ok: true, solBalance, usdcBalance };
}

export async function buildBatchSettlementTransaction(
  connection: Connection,
  publicKey: PublicKey,
  amountMicroUsdc: number
): Promise<BuiltSettlementTransaction> {
  const preflight = await checkBatchSettlementPreflight(
    connection,
    publicKey,
    amountMicroUsdc
  );
  if (!preflight.ok) {
    throw new Error(preflight.error ?? "Batch settlement preflight failed.");
  }

  const sourceAta = await getAssociatedTokenAddress(
    DEVNET_USDC_MINT,
    publicKey
  );

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
      amountMicroUsdc
    )
  );

  return { transaction, blockhash, lastValidBlockHeight };
}

export async function buildSettlementTransaction(
  connection: Connection,
  publicKey: PublicKey
): Promise<BuiltSettlementTransaction> {
  return buildBatchSettlementTransaction(
    connection,
    publicKey,
    SETTLEMENT_USDC_AMOUNT
  );
}

function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number }).code;
  return code === 4001 || code === 4100;
}

function formatSettlementError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("insufficient") && msg.includes("sol")) {
      return "Insufficient devnet SOL for fees. Use faucet.solana.com (Devnet).";
    }
    if (msg.includes("insufficient")) {
      return "Insufficient devnet USDC. Use spl-token-faucet.com on Devnet.";
    }
    return error.message;
  }
  return "Settlement transaction failed.";
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
    const { transaction, blockhash, lastValidBlockHeight } =
      await buildSettlementTransaction(connection, publicKey);

    const signature = await sendTransaction(transaction, connection);
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      "confirmed"
    );

    return { status: "settled", signature };
  } catch (error) {
    if (isUserRejection(error)) {
      return {
        status: "failed",
        error: "Transaction cancelled in wallet.",
      };
    }

    const preflight = await checkSettlementPreflight(connection, publicKey);
    if (!preflight.ok) {
      return { status: "failed", error: preflight.error };
    }

    return { status: "failed", error: formatSettlementError(error) };
  }
}

export function serializeSettlementTransaction(
  transaction: Transaction
): string {
  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false })
  ).toString("base64");
}

export function getDevnetExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
