/**
 * Renders the advisor's final pick: node name, trust score, "Best For" tags,
 * and the plain-English reason. It also pulls the matched node's hard metrics
 * (latency, uptime, price, verification) from the mock data layer so the user
 * sees the verifiable facts next to the AI's prose, not just the prose alone.
 */
import TrustScoreBadge from "@/components/TrustScoreBadge";
import { getNodeById } from "@/lib/mockNodes";
import type { GeminiRecommendation } from "@/types/trustAdvisor";

interface RecommendationCardProps {
  recommendation: GeminiRecommendation;
  onSelectNode?: (nodeId: string) => void;
}

/** Small labeled metric row, matching the marketplace card's style. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function RecommendationCard({
  recommendation,
  onSelectNode,
}: RecommendationCardProps) {
  // Enrich with the real node record. The server already reconciled the id,
  // so this should always resolve — but we guard for missing data defensively.
  const node = getNodeById(recommendation.recommendedNodeId);

  return (
    <article className="animate-fade-up rounded-xl border border-accent/30 bg-surface p-6 shadow-lg shadow-accent/5">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-accent">
          Recommended Node
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            {recommendation.recommendedNodeName}
          </h3>
          {node && <p className="text-sm text-muted">{node.region}</p>}
        </div>
        <TrustScoreBadge score={recommendation.trustScore} />
      </div>

      {/* "Best For" tags from Gemini. */}
      {recommendation.bestFor.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recommendation.bestFor.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Verifiable metrics, shown only when we have the node record. */}
      {node && (
        <div className="mt-5 space-y-2.5 border-t border-border pt-4">
          <Metric label="Latency" value={`${node.latency} ms`} />
          <Metric label="Uptime" value={`${node.uptime}%`} />
          <Metric
            label="Price / Session"
            value={`$${node.pricePerSession.toFixed(2)}`}
          />
          <Metric
            label="Verification"
            value={node.verified ? "Verified" : "Unverified"}
          />
          <Metric
            label="Human Lane"
            value={node.humanLaneAvailable ? "Available" : "Not available"}
          />
        </div>
      )}

      {/* Plain-English justification. */}
      <div className="mt-5 rounded-lg border border-border bg-background/50 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          Why this node
        </p>
        <p className="mt-1.5 text-sm leading-relaxed">
          {recommendation.reason}
        </p>
      </div>

      {onSelectNode && (
        <button
          type="button"
          onClick={() => {
            onSelectNode(recommendation.recommendedNodeId);
            document
              .getElementById("marketplace")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Use Recommended Node
        </button>
      )}
    </article>
  );
}
