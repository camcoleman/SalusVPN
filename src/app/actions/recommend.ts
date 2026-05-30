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
import { getRecommendation, GeminiAdvisorError } from "@/lib/gemini";
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
    // Log the real cause server-side for debugging...
    console.error("[recommendNode] recommendation failed:", error);
    // ...but only surface a safe, friendly message to the client.
    const message =
      error instanceof GeminiAdvisorError
        ? error.userMessage
        : "Something went wrong while generating your recommendation. Please try again.";
    return { ok: false, error: message };
  }
}
