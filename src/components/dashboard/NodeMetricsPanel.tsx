"use client";

import { useSessionSelection } from "@/context/SessionSelectionContext";

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function NodeMetricsPanel() {
  const { selectedNode } = useSessionSelection();

  if (!selectedNode) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <p className="text-sm text-muted">
          Select a relay node in the marketplace to view detailed metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{selectedNode.name}</h3>
        <p className="text-sm text-muted">{selectedNode.region}</p>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4">
        <MetricRow label="Latency" value={`${selectedNode.latency} ms`} />
        <MetricRow label="Uptime" value={`${selectedNode.uptime}%`} />
        <MetricRow
          label="Traffic Quality"
          value={`${selectedNode.trafficQualityScore}/100`}
        />
        <MetricRow
          label="Bot Risk Score"
          value={`${selectedNode.botRiskScore}/100`}
        />
        <MetricRow
          label="Price per Session"
          value={`$${selectedNode.pricePerSession.toFixed(2)} USDC`}
        />
        <MetricRow
          label="Human Lane"
          value={selectedNode.humanLaneAvailable ? "Available" : "Unavailable"}
        />
      </div>
    </div>
  );
}
