/**
 * Gemini API wrapper for the AI-Powered Trust Advisor.
 *
 * Design rules this file enforces:
 * - It is the ONLY module that imports the Gemini SDK or touches the API key.
 *   Components never call Gemini directly — they call a server action / route
 *   handler that calls `getRecommendation()` here.
 * - The API key is read from `process.env.GEMINI_API_KEY` (no NEXT_PUBLIC_
 *   prefix) so it stays server-side and never ships to the browser.
 * - The prompt lives in its own `buildGeminiPrompt()` function so it's easy to
 *   iterate on without untangling it from the request/parse logic.
 * - Failures throw a typed `GeminiAdvisorError` carrying a user-friendly
 *   message, so the UI always has something meaningful to show.
 */
import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { getRelayNodes, getNodeById } from "@/lib/mockNodes";
import {
  PREFERENCE_OPTIONS,
  type GeminiRecommendation,
  type RelayNode,
  type UserPreference,
} from "@/types/trustAdvisor";

/** Default model if `GEMINI_MODEL` isn't set. Flash is fast + cheap for this. */
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * Error type for anything that goes wrong while producing a recommendation.
 * Carrying a `userMessage` separate from the technical `message` lets the UI
 * show a friendly line while we still log the real cause server-side.
 */
export class GeminiAdvisorError extends Error {
  /** Safe, human-friendly message intended for display in the UI. */
  readonly userMessage: string;

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage);
    this.name = "GeminiAdvisorError";
    this.userMessage = userMessage;
    // Preserve the original error for server-side logging/debugging.
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * The JSON shape we force Gemini to return. By passing this as a
 * `responseSchema` (with `responseMimeType: "application/json"`), the model is
 * constrained to emit exactly these fields, so we avoid brittle text parsing
 * and the output lines up 1:1 with our `GeminiRecommendation` interface.
 */
const recommendationSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    recommendedNodeId: {
      type: SchemaType.STRING,
      description: "The `id` of the single best relay node for the preference.",
    },
    recommendedNodeName: {
      type: SchemaType.STRING,
      description: "The `name` of that same node.",
    },
    trustScore: {
      type: SchemaType.NUMBER,
      description: "The chosen node's trustScore, copied verbatim.",
    },
    bestFor: {
      type: SchemaType.ARRAY,
      description: "2-4 short tags describing what the node is best for.",
      items: { type: SchemaType.STRING },
    },
    reason: {
      type: SchemaType.STRING,
      description:
        "1-3 sentences of plain English explaining the pick to a non-expert.",
    },
  },
  required: [
    "recommendedNodeId",
    "recommendedNodeName",
    "trustScore",
    "bestFor",
    "reason",
  ],
};

/**
 * Reads and validates the API key from the environment.
 * Throws early with a clear message if it's missing/placeholder, so we fail
 * with actionable feedback instead of an opaque 401 from the API.
 */
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key-here") {
    throw new GeminiAdvisorError(
      "The recommendation service isn't configured yet. Add GEMINI_API_KEY to .env.local.",
    );
  }
  return key;
}

/**
 * Builds the full prompt sent to Gemini.
 *
 * Kept deliberately isolated so prompt tuning is a localized change. We feed
 * the model the live node data as JSON plus the user's chosen optimization
 * goal, and tell it to reason over the verifiable signals (verification,
 * latency, reliability, trust, human lane) and pick exactly one node.
 *
 * @param nodes      The candidate relay nodes to choose from.
 * @param preference The user's selected optimization goal.
 * @returns A single prompt string.
 */
export function buildGeminiPrompt(
  nodes: RelayNode[],
  preference: UserPreference,
): string {
  const option = PREFERENCE_OPTIONS.find((p) => p.id === preference);
  // Fall back gracefully if an unknown slug ever slips through.
  const preferenceLabel = option?.label ?? preference;
  const preferenceDescription =
    option?.description ?? "Pick the best all-round node.";

  // Serialize nodes compactly; the model only needs the decision-relevant fields.
  const nodeData = JSON.stringify(
    nodes.map((n) => ({
      id: n.id,
      name: n.name,
      region: n.region,
      latency: n.latency,
      trustScore: n.trustScore,
      pricePerSession: n.pricePerSession,
      verified: n.verified,
      humanLaneAvailable: n.humanLaneAvailable,
      trafficQualityScore: n.trafficQualityScore,
      botRiskScore: n.botRiskScore,
      uptime: n.uptime,
    })),
    null,
    2,
  );

  return `You are the Trust Advisor for SalusVPN, a verifiable VPN platform.
Your job is to recommend the single best relay node for the user's goal.

USER PREFERENCE: "${preferenceLabel}"
What that means: ${preferenceDescription}

How to weigh the signals for each preference:
- Best Overall: balance trustScore, latency, uptime, verification, and price.
- Lowest Cost: minimize pricePerSession, but never pick an unverified node.
- Lowest Latency: minimize latency, keeping the node reasonably trustworthy.
- Highest Trust: maximize trustScore + verification, minimize botRiskScore.
- Streaming: favor high uptime and trafficQualityScore with low-to-mid latency.
- General Browsing: a dependable, verified node with solid all-round numbers.

CANDIDATE NODES (choose exactly one, by its "id"):
${nodeData}

Rules:
- Recommend exactly ONE node from the list above.
- "recommendedNodeId" and "recommendedNodeName" MUST match a node in the list.
- "trustScore" MUST be that node's trustScore copied exactly.
- "bestFor" should be 2-4 short tags (e.g. "Streaming", "Low Latency").
- "reason" must be plain English a non-technical person understands, and should
  reference the concrete signals that drove the choice (e.g. "lowest latency at
  22ms and a verified human lane").`;
}

/**
 * Asks Gemini for the best relay node given a user preference.
 *
 * Flow: load nodes -> build prompt -> call the model with a strict JSON schema
 * -> parse -> reconcile the model's pick against real node data (so a wrong id
 * or stale trustScore can't reach the UI) -> return a clean object.
 *
 * @param preference The user's selected optimization goal.
 * @returns A validated {@link GeminiRecommendation}.
 * @throws {GeminiAdvisorError} with a user-facing message on any failure.
 */
export async function getRecommendation(
  preference: UserPreference,
): Promise<GeminiRecommendation> {
  // Guard against accidental client-side usage that would leak the key.
  if (typeof window !== "undefined") {
    throw new GeminiAdvisorError(
      "The recommendation service can only run on the server.",
    );
  }

  const apiKey = getApiKey();
  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const nodes = await getRelayNodes();
  if (nodes.length === 0) {
    throw new GeminiAdvisorError("No relay nodes are available to evaluate.");
  }

  const prompt = buildGeminiPrompt(nodes, preference);

  let rawJson: string;
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        // Force structured JSON that matches our schema.
        responseMimeType: "application/json",
        responseSchema: recommendationSchema,
        // Low temperature: we want consistent, defensible picks, not creativity.
        temperature: 0.2,
      },
    });

    const result = await model.generateContent(prompt);
    rawJson = result.response.text();
  } catch (cause) {
    // Network errors, auth errors, quota, model not found, etc.
    throw new GeminiAdvisorError(
      "We couldn't reach the recommendation service. Please try again in a moment.",
      { cause },
    );
  }

  return parseAndReconcile(rawJson);
}

/**
 * Parses Gemini's JSON and reconciles it with the real node list.
 *
 * Even with a response schema, we don't blindly trust the model: we verify the
 * recommended id maps to a known node and overwrite the name/trustScore from
 * our own data. This keeps the UI accurate even if the model fudges a field.
 */
function parseAndReconcile(rawJson: string): GeminiRecommendation {
  let parsed: Partial<GeminiRecommendation>;
  try {
    parsed = JSON.parse(rawJson) as Partial<GeminiRecommendation>;
  } catch (cause) {
    throw new GeminiAdvisorError(
      "The recommendation came back in an unexpected format. Please try again.",
      { cause },
    );
  }

  const matched = parsed.recommendedNodeId
    ? getNodeById(parsed.recommendedNodeId)
    : undefined;

  if (!matched) {
    throw new GeminiAdvisorError(
      "The advisor suggested a node we don't recognize. Please try again.",
    );
  }

  // Trust our own data for the factual fields; trust the model for the prose.
  return {
    recommendedNodeId: matched.id,
    recommendedNodeName: matched.name,
    trustScore: matched.trustScore,
    bestFor:
      Array.isArray(parsed.bestFor) && parsed.bestFor.length > 0
        ? parsed.bestFor.slice(0, 4)
        : ["Recommended"],
    reason:
      typeof parsed.reason === "string" && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : `${matched.name} is a strong match for your selected preference.`,
  };
}
