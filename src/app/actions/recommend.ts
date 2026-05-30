"use server";

/**
 * Server Action that bridges the client UI to the server-only Gemini wrapper.
 *
 * Why a Server Action (vs. calling `getRecommendation` from a component):
 * - `lib/gemini.ts` reads `GEMINI_API_KEY` from the server environment. Running
 *   it inside this `"use server"` module guarantees the key (and the SDK) never
 *   get bundled into the browser.
 * - It returns a typed *result object* instead of throwing, so the client can
 *   render success/error states declaratively without try/catch in the UI.
 */
import { getRecommendation } from "@/lib/gemini";
import {
  PREFERENCE_OPTIONS,
  type GeminiRecommendation,
  type UserPreference,
} from "@/types/trustAdvisor";

/**
 * Discriminated union returned to the client. The `ok` flag is the
 * discriminant, so TypeScript narrows `recommendation` vs. `error` for callers.
 */
export type RecommendationResult =
  | { ok: true; recommendation: GeminiRecommendation }
  | { ok: false; error: string };

/**
 * Hand-authored fallback recommendations, one per preference.
 *
 * Used when Gemini is unavailable (no/invalid API key, network error, quota,
 * bad response, etc.) so the feature still works in demos and offline dev. By
 * design we return these *silently as a success* — the user never sees an
 * error. Each entry matches the `GeminiRecommendation` shape exactly, and the
 * `recommendedNodeId` values line up with real ids in `data/relayNodes.ts`
 * (NYC-1 -> "nyc-1", etc.) so `RecommendationCard` can still enrich them.
 */
const FALLBACK_RECOMMENDATIONS: Record<UserPreference, GeminiRecommendation> = {
  "best-overall": {
    recommendedNodeId: "nyc-1",
    recommendedNodeName: "NYC-1",
    trustScore: 97,
    bestFor: ["Privacy", "General Browsing", "Speed"],
    reason:
      "NYC-1 has the highest combined trust score with excellent uptime and low latency, making it the best all-around choice.",
  },
  "lowest-cost": {
    recommendedNodeId: "tokyo-1",
    recommendedNodeName: "Tokyo-1",
    trustScore: 81,
    bestFor: ["Budget", "General Browsing"],
    reason:
      "Tokyo-1 offers the lowest session price at $0.06 while maintaining acceptable trust and reliability.",
  },
  "lowest-latency": {
    recommendedNodeId: "nyc-1",
    recommendedNodeName: "NYC-1",
    trustScore: 97,
    bestFor: ["Gaming", "Real-time calls", "Speed"],
    reason:
      "NYC-1 delivers the fastest response times at 22ms, ideal for latency-sensitive applications.",
  },
  "highest-trust": {
    recommendedNodeId: "nyc-1",
    recommendedNodeName: "NYC-1",
    trustScore: 97,
    bestFor: ["Privacy", "Security", "Verified"],
    reason:
      "NYC-1 has the highest trust score with recent verification, human lane availability, and excellent traffic quality.",
  },
  streaming: {
    recommendedNodeId: "sf-1",
    recommendedNodeName: "SF-1",
    trustScore: 95,
    bestFor: ["Streaming", "High throughput", "Stability"],
    reason:
      "SF-1 provides stable high-throughput connections optimized for video streaming with minimal buffering.",
  },
  "general-browsing": {
    recommendedNodeId: "london-1",
    recommendedNodeName: "London-1",
    trustScore: 92,
    bestFor: ["Everyday use", "Privacy", "Reliability"],
    reason:
      "London-1 is a dependable everyday node with strong verification and consistent performance for normal web use.",
  },
};

/**
 * Produces a relay-node recommendation for the given user preference.
 *
 * @param preference The user's selected optimization goal (a slug).
 * @returns A {@link RecommendationResult} — never throws to the client.
 */
export async function recommendNode(
  preference: UserPreference,
): Promise<RecommendationResult> {
  // Validate the incoming value against the known options. Server Actions can
  // be invoked with arbitrary input, so we never trust the argument blindly.
  const isKnown = PREFERENCE_OPTIONS.some((option) => option.id === preference);
  if (!isKnown) {
    return { ok: false, error: "Please choose a valid preference." };
  }

  try {
    const recommendation = await getRecommendation(preference);
    return { ok: true, recommendation };
  } catch (error) {
    // Gemini failed (missing/invalid key, network, quota, bad response, ...).
    // We log the real cause server-side for debugging, then fall back to a
    // curated recommendation and return it as a *success*. The user sees a
    // seamless result instead of an error.
    console.error(
      "[recommendNode] Gemini unavailable, serving fallback:",
      error,
    );
    return { ok: true, recommendation: FALLBACK_RECOMMENDATIONS[preference] };
  }
}
