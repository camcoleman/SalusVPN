const DEVNET_CLUSTER = "devnet";

function getDevnetExplorerUrl(signature) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${DEVNET_CLUSTER}`;
}

function shortenSignature(signature) {
  return `${signature.slice(0, 8)}…${signature.slice(-8)}`;
}
