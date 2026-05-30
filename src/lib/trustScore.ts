export interface TrustScoreInput {
  uptime: number;
  latency: number;
  trafficQualityScore: number;
  botRiskScore: number;
  verified: boolean;
}

export type TrustScoreLabel = "Excellent" | "Good" | "Fair" | "Warning";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreLatency(latency: number): number {
  return clamp(100 - (latency - 20) * 1.5, 0, 100);
}

export function calculateTrustScore(input: TrustScoreInput): number {
  const uptimeScore = input.uptime;
  const latencyScore = scoreLatency(input.latency);
  const trafficScore = input.trafficQualityScore;
  const botScore = 100 - input.botRiskScore;
  const verificationScore = input.verified ? 100 : 40;

  const weighted =
    uptimeScore * 0.25 +
    latencyScore * 0.2 +
    trafficScore * 0.25 +
    botScore * 0.2 +
    verificationScore * 0.1;

  return Math.round(clamp(weighted, 0, 100));
}

export function getTrustScoreLabel(score: number): TrustScoreLabel {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Fair";
  return "Warning";
}

export interface TrustScoreFactor {
  label: string;
  score: number;
  weight: number;
}

export function getTrustScoreFactors(input: TrustScoreInput): TrustScoreFactor[] {
  return [
    { label: "Uptime", score: input.uptime, weight: 0.25 },
    { label: "Latency", score: scoreLatency(input.latency), weight: 0.2 },
    { label: "Traffic Quality", score: input.trafficQualityScore, weight: 0.25 },
    { label: "Bot Safety", score: 100 - input.botRiskScore, weight: 0.2 },
    {
      label: "Verification",
      score: input.verified ? 100 : 40,
      weight: 0.1,
    },
  ];
}

export function getTrustScoreColors(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  const label = getTrustScoreLabel(score);

  switch (label) {
    case "Excellent":
      return {
        bg: "bg-accent-green/10",
        text: "text-accent-green",
        border: "border-accent-green/30",
      };
    case "Good":
      return {
        bg: "bg-accent-green/10",
        text: "text-accent-green",
        border: "border-accent-green/30",
      };
    case "Fair":
      return {
        bg: "bg-accent-amber/10",
        text: "text-accent-amber",
        border: "border-accent-amber/30",
      };
    case "Warning":
      return {
        bg: "bg-accent-red/10",
        text: "text-accent-red",
        border: "border-accent-red/30",
      };
  }
}
