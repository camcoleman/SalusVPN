/**
 * Shown while Gemini is generating a recommendation.
 *
 * Uses a skeleton that mirrors the shape of `RecommendationCard` (header, tags,
 * paragraph) so the layout doesn't visibly "jump" when the real result swaps
 * in. `role="status"` + `aria-live` announce progress to assistive tech.
 */
export default function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="rounded-xl border border-border bg-surface p-6"
    >
      <div className="flex items-center gap-3">
        {/* Spinner: pure CSS so there's no asset dependency. */}
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        <p className="text-sm font-medium text-muted">
          Analyzing relay nodes and building your recommendation…
        </p>
      </div>

      {/* Pulsing placeholders standing in for the eventual card content. */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-surface-elevated" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-6 w-24 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-6 w-16 animate-pulse rounded-md bg-surface-elevated" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full animate-pulse rounded bg-surface-elevated" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface-elevated" />
        </div>
      </div>

      {/* Visually hidden but read aloud by screen readers. */}
      <span className="sr-only">Loading recommendation</span>
    </div>
  );
}
