import type { RelayNode } from "@/data/relayNodes";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import AttestationHashLink from "@/components/AttestationHashLink";

interface NodeCardProps {
  node: RelayNode;
  selected?: boolean;
  onSelect?: (nodeId: string) => void;
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "green" | "blue" | "amber" | "muted";
}) {
  const styles = {
    green: "bg-accent-green/10 text-accent-green border-accent-green/30",
    blue: "bg-accent/10 text-accent border-accent/30",
    amber: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
    muted: "bg-surface-elevated text-muted border-border",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function NodeCard({
  node,
  selected = false,
  onSelect,
}: NodeCardProps) {
  const lowBotRisk = node.botRiskScore < 30;

  return (
    <article
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(node.id) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(node.id);
              }
            }
          : undefined
      }
      className={`group rounded-xl border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 ${
        onSelect ? "cursor-pointer" : ""
      } ${
        selected
          ? "border-accent/60 ring-2 ring-accent"
          : "border-border"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{node.name}</h3>
          <p className="text-sm text-muted">{node.region}</p>
        </div>
        <TrustScoreBadge score={node.trustScore} />
      </div>

      <div className="mb-4 space-y-2.5">
        <MetricRow label="Latency" value={`${node.latency} ms`} />
        <MetricRow
          label="Traffic Quality"
          value={`${node.trafficQualityScore}/100`}
        />
        <MetricRow
          label="Price / Session"
          value={`$${node.pricePerSession.toFixed(2)}`}
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Badge variant={node.verified ? "green" : "amber"}>
          {node.verified ? "Verified" : "Unverified"}
        </Badge>
        {node.humanLaneAvailable && (
          <Badge variant="blue">Human Lane</Badge>
        )}
        {lowBotRisk && <Badge variant="green">Low Bot Risk</Badge>}
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-xs">
        <span className="text-muted">Hash</span>
        <AttestationHashLink hash={node.attestationHash} />
      </div>
    </article>
  );
}
