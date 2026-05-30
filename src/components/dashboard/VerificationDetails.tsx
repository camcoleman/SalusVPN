"use client";

import { useSessionSelection } from "@/context/SessionSelectionContext";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium sm:text-right">{value}</span>
    </div>
  );
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function VerificationDetails() {
  const { selectedNode } = useSessionSelection();

  if (!selectedNode) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <p className="text-sm text-muted">
          Select a relay node to inspect verification and attestation details.
        </p>
      </div>
    );
  }

  const verifiedAt = new Date(selectedNode.lastVerified).toLocaleString();

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Verification Details</h3>
        <p className="text-sm text-muted">
          Attestation and verification status for {selectedNode.name}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4">
        <DetailRow
          label="Verification Status"
          value={
            <span
              className={
                selectedNode.verified ? "text-accent-green" : "text-accent-amber"
              }
            >
              {selectedNode.verified ? "Verified" : "Unverified"}
            </span>
          }
        />
        <DetailRow label="Last Verified" value={verifiedAt} />
        <DetailRow
          label="Attestation Hash"
          value={
            <code className="font-mono text-xs">
              {truncateHash(selectedNode.attestationHash)}
            </code>
          }
        />
        <DetailRow
          label="Human Lane"
          value={
            selectedNode.humanLaneAvailable
              ? "Attested human-only lane"
              : "Not available"
          }
        />
        <DetailRow label="Node ID" value={selectedNode.id} />
      </div>
    </div>
  );
}
