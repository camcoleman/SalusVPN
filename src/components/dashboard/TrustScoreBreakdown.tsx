"use client";

import { useSessionSelection } from "@/context/SessionSelectionContext";
import TrustScoreBadge from "@/components/TrustScoreBadge";
import {
  getTrustScoreFactors,
  getTrustScoreLabel,
} from "@/lib/trustScore";

function FactorBar({
  label,
  score,
  weight,
}: {
  label: string;
  score: number;
  weight: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">
          {score} <span className="text-muted">({Math.round(weight * 100)}%)</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function TrustScoreBreakdown() {
  const { selectedNode } = useSessionSelection();

  if (!selectedNode) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
        <p className="text-sm text-muted">
          Select a relay node to see how its trust score is calculated.
        </p>
      </div>
    );
  }

  const factors = getTrustScoreFactors({
    uptime: selectedNode.uptime,
    latency: selectedNode.latency,
    trafficQualityScore: selectedNode.trafficQualityScore,
    botRiskScore: selectedNode.botRiskScore,
    verified: selectedNode.verified,
  });

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Trust Score</h3>
          <p className="text-sm text-muted">
            Composite rating for {selectedNode.name}
          </p>
        </div>
        <TrustScoreBadge score={selectedNode.trustScore} />
      </div>

      <p className="mb-4 text-sm text-muted">
        Overall rating:{" "}
        <span className="font-medium text-foreground">
          {getTrustScoreLabel(selectedNode.trustScore)}
        </span>
      </p>

      <div className="space-y-4">
        {factors.map((factor) => (
          <FactorBar
            key={factor.label}
            label={factor.label}
            score={factor.score}
            weight={factor.weight}
          />
        ))}
      </div>
    </div>
  );
}
