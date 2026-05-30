"use client";

/**
 * Lets the user pick what to optimize for. Pure presentation + callbacks — it
 * holds no state itself; the parent owns the selected value (single source of
 * truth) and decides what happens on change. Options are read from
 * `PREFERENCE_OPTIONS` so adding/removing a choice is a one-line data edit.
 */
import {
  PREFERENCE_OPTIONS,
  type UserPreference,
} from "@/types/trustAdvisor";

interface PreferenceSelectorProps {
  /** Currently selected preference, or null when nothing is chosen yet. */
  value: UserPreference | null;
  /** Called with the chosen preference when the user clicks an option. */
  onChange: (preference: UserPreference) => void;
  /** Disables interaction (e.g. while a recommendation is loading). */
  disabled?: boolean;
}

export default function PreferenceSelector({
  value,
  onChange,
  disabled = false,
}: PreferenceSelectorProps) {
  return (
    // `radiogroup` semantics: exactly one option is selectable at a time.
    <div
      role="radiogroup"
      aria-label="Optimization preference"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {PREFERENCE_OPTIONS.map((option) => {
        const isSelected = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={`rounded-xl border p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 ${
              isSelected
                ? "border-accent bg-accent/10 shadow-lg shadow-accent/5"
                : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent/40"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold tracking-tight">
                {option.label}
              </span>
              {/* Filled dot mirrors the selected state for quick scanning. */}
              <span
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 rounded-full border transition-colors ${
                  isSelected
                    ? "border-accent bg-accent"
                    : "border-border bg-transparent"
                }`}
              />
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {option.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
