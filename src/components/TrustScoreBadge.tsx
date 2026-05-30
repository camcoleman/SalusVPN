import {
  getTrustScoreColors,
  getTrustScoreLabel,
} from "@/lib/trustScore";

interface TrustScoreBadgeProps {
  score: number;
}

export default function TrustScoreBadge({ score }: TrustScoreBadgeProps) {
  const label = getTrustScoreLabel(score);
  const colors = getTrustScoreColors(score);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span>{score}</span>
      <span className="text-muted font-normal">·</span>
      <span>{label}</span>
    </span>
  );
}
