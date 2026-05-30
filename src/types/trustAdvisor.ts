/**
 * Shared type definitions for the AI-Powered Trust Advisor feature.
 *
 * Why a dedicated types module:
 * - Keeps a single source of truth for the data shapes that flow between the
 *   mock data layer (`lib/mockNodes.ts`), the Gemini wrapper (`lib/gemini.ts`),
 *   and the UI components (`components/TrustAdvisor/*`).
 * - Lets us swap the data source or the model layer later without each consumer
 *   re-declaring (and slowly diverging) its own version of these interfaces.
 */

/**
 * A single VPN relay node and the verifiable signals we know about it.
 *
 * This is the canonical definition for the whole app. `src/data/relayNodes.ts`
 * imports it so the runtime mock data and these types can never drift apart.
 *
 * Field intent (these map directly to what the Trust Advisor reasons over):
 * - `verified`            -> verification status (is the node attested?)
 * - `latency`             -> network responsiveness in ms (lower is better)
 * - `uptime`             -> reliability as a % (higher is better)
 * - `trustScore`          -> 0-100 composite score (see `lib/trustScore.ts`)
 * - `humanLaneAvailable`  -> whether a verified human-only lane exists
 */
export interface RelayNode {
  /** Stable machine identifier, e.g. "nyc-1". Used to match Gemini's pick. */
  id: string;
  /** Human-readable name shown in the UI, e.g. "NYC-1". */
  name: string;
  /** Geographic region label, e.g. "US East". */
  region: string;
  /** Round-trip latency in milliseconds. Lower is better. */
  latency: number;
  /** Composite 0-100 trust score derived in `lib/trustScore.ts`. */
  trustScore: number;
  /** Cost to run one session, in USD. Lower is cheaper. */
  pricePerSession: number;
  /** True when the node has a valid cryptographic attestation. */
  verified: boolean;
  /** True when a verified "human lane" (bot-filtered traffic) is offered. */
  humanLaneAvailable: boolean;
  /** 0-100 measure of how clean/legitimate the node's traffic is. */
  trafficQualityScore: number;
  /** 0-100 estimate of bot/abusive traffic risk. Lower is better. */
  botRiskScore: number;
  /** Reliability as an uptime percentage, e.g. 99.9. */
  uptime: number;
  /** ISO-8601 timestamp of the most recent verification check. */
  lastVerified: string;
  /** On-chain / attestation hash proving the node's last verification. */
  attestationHash: string;
}

/**
 * The set of optimization goals a user can pick from in the UI.
 *
 * Modeled as a string-literal union (rather than a free string) so the compiler
 * rejects typos and every consumer must handle exactly these cases. The slugs
 * are URL/route friendly; human labels live in `PREFERENCE_OPTIONS` below.
 */
export type UserPreference =
  | "best-overall"
  | "lowest-cost"
  | "lowest-latency"
  | "highest-trust"
  | "streaming"
  | "general-browsing";

/**
 * UI-facing metadata for a single preference option.
 * Separating this from the `UserPreference` union lets the selector render
 * friendly labels/descriptions while the rest of the code reasons over slugs.
 */
export interface PreferenceOption {
  id: UserPreference;
  /** Short label shown on the button/chip. */
  label: string;
  /** One-line explanation of what optimizing for this preference means. */
  description: string;
}

/**
 * The ordered list the UI iterates over to render preference choices.
 * Kept here (next to the union) so adding a preference is a single edit that
 * the type system then forces every switch/handler to account for.
 */
export const PREFERENCE_OPTIONS: PreferenceOption[] = [
  {
    id: "best-overall",
    label: "Best Overall",
    description: "A balanced pick across trust, speed, reliability, and cost.",
  },
  {
    id: "lowest-cost",
    label: "Lowest Cost",
    description: "Cheapest session price while staying reasonably trustworthy.",
  },
  {
    id: "lowest-latency",
    label: "Lowest Latency",
    description: "Fastest response time for gaming or real-time calls.",
  },
  {
    id: "highest-trust",
    label: "Highest Trust",
    description: "Maximize verification, trust score, and low bot risk.",
  },
  {
    id: "streaming",
    label: "Streaming",
    description: "Stable, high-throughput nodes suited to video streaming.",
  },
  {
    id: "general-browsing",
    label: "General Browsing",
    description: "A dependable everyday node for normal web use.",
  },
];

/**
 * The structured recommendation we expect back from Gemini.
 *
 * Gemini is constrained (via a response schema in `lib/gemini.ts`) to return
 * exactly this shape as JSON, so the UI can render it without brittle parsing.
 */
export interface GeminiRecommendation {
  /** Machine id of the chosen node; must match a `RelayNode.id`. */
  recommendedNodeId: string;
  /** Display name of the chosen node (mirrors the matched node's `name`). */
  recommendedNodeName: string;
  /** The chosen node's trust score, echoed for convenient display. */
  trustScore: number;
  /** Short "Best For" tags, e.g. ["Streaming", "Low Latency"]. */
  bestFor: string[];
  /** Plain-English justification a non-technical user can understand. */
  reason: string;
}
