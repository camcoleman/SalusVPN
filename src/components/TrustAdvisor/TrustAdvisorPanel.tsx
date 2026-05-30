"use client";

/**
 * Container for the AI-Powered Trust Advisor.
 *
 * Responsibilities (kept here so the child components stay dumb/presentational):
 * - Owns the selected preference + request status (a small state machine).
 * - Calls the `recommendNode` Server Action, which runs Gemini server-side.
 * - Decides which child to render: selector always, then loading / error /
 *   result depending on `status`.
 *
 * The child components (PreferenceSelector, LoadingState, RecommendationCard)
 * have no idea Gemini exists — they only receive data and callbacks.
 */
import { useState } from "react";
import PreferenceSelector from "@/components/TrustAdvisor/PreferenceSelector";
import LoadingState from "@/components/TrustAdvisor/LoadingState";
import RecommendationCard from "@/components/TrustAdvisor/RecommendationCard";
import { recommendNode } from "@/app/actions/recommend";
import type {
  GeminiRecommendation,
  UserPreference,
} from "@/types/trustAdvisor";

/** Explicit status union so the render logic is exhaustive and predictable. */
type Status = "idle" | "loading" | "success" | "error";

export default function TrustAdvisorPanel() {
  const [preference, setPreference] = useState<UserPreference | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [recommendation, setRecommendation] =
    useState<GeminiRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = status === "loading";

  /**
   * Calls the Server Action and maps its typed result onto local state.
   * Note we never `throw` here — the action returns `{ ok }`, so a failed
   * recommendation becomes a friendly error message, not a crash.
   */
  async function handleGetRecommendation() {
    if (!preference || isLoading) return;

    setStatus("loading");
    setError(null);
    setRecommendation(null);

    const result = await recommendNode(preference);

    if (result.ok) {
      setRecommendation(result.recommendation);
      setStatus("success");
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AI Trust Advisor
        </h2>
        <p className="mt-2 max-w-2xl text-muted">
          Tell us what matters most and our advisor will analyze every relay
          node&apos;s verification, latency, reliability, and trust signals to
          recommend the best match.
        </p>
      </div>

      <PreferenceSelector
        value={preference}
        onChange={setPreference}
        disabled={isLoading}
      />

      <div className="mt-6">
        <button
          type="button"
          onClick={handleGetRecommendation}
          disabled={!preference || isLoading}
          className="inline-flex h-12 items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Analyzing…" : "Get Recommendation"}
        </button>
      </div>

      {/* Result region: loading / error / success are mutually exclusive. */}
      <div className="mt-6">
        {status === "loading" && <LoadingState />}

        {status === "error" && error && (
          <div
            role="alert"
            className="rounded-xl border border-accent-red/30 bg-accent-red/10 p-4"
          >
            <p className="text-sm font-medium text-accent-red">{error}</p>
            <button
              type="button"
              onClick={handleGetRecommendation}
              className="mt-2 text-sm font-medium text-accent underline-offset-2 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && recommendation && (
          <RecommendationCard recommendation={recommendation} />
        )}
      </div>
    </div>
  );
}
