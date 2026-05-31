/**
 * Renders an attestation signature as a subtle link to the Solana Explorer
 * (devnet), reinforcing the "verifiable infrastructure" story by letting anyone
 * click through to a real on-chain transaction. The full signature is used in
 * the URL while only a truncated form is shown to keep the UI compact.
 */
interface AttestationHashLinkProps {
  hash: string;
  className?: string;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function getSolanaExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export default function AttestationHashLink({
  hash,
  className = "",
}: AttestationHashLinkProps) {
  return (
    <a
      href={getSolanaExplorerUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      title="View attestation on Solana Explorer (Devnet)"
      className={`group/hash inline-flex items-center gap-1 text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline ${className}`}
    >
      <span className="tabular-nums">{truncateHash(hash)}</span>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="opacity-60 transition-opacity group-hover/hash:opacity-100"
      >
        <path d="M7 17 17 7" />
        <path d="M7 7h10v10" />
      </svg>
    </a>
  );
}
