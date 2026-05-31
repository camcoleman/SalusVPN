import { calculateTrustScore } from "@/lib/trustScore";
import type { RelayNode } from "@/types/trustAdvisor";

// Re-export so existing imports (`import { RelayNode } from "@/data/relayNodes"`)
// keep working while the interface itself lives in one canonical place.
export type { RelayNode };

type RawRelayNode = Omit<RelayNode, "trustScore">;

const rawNodes: RawRelayNode[] = [
  {
    id: "nyc-1",
    name: "NYC-1",
    region: "US East",
    latency: 22,
    pricePerSession: 0.08,
    verified: true,
    humanLaneAvailable: true,
    trafficQualityScore: 96,
    botRiskScore: 8,
    uptime: 99.9,
    lastVerified: "2026-05-30T08:15:00Z",
    demoIp: "104.21.73.142",
    // Real confirmed Solana devnet transaction so the signature resolves on Solana Explorer.
    attestationHash:
      "589RVubpTJAPBaVxxHssvuKe6WbRaqHEd4nq323wNFqzGw6hWh9YfKanqUvEr83Y46TSt9ZTNMURvP7JckvdeqgF",
  },
  {
    id: "sf-1",
    name: "SF-1",
    region: "US West",
    latency: 28,
    pricePerSession: 0.09,
    verified: true,
    humanLaneAvailable: true,
    trafficQualityScore: 94,
    botRiskScore: 12,
    uptime: 99.7,
    lastVerified: "2026-05-30T07:42:00Z",
    demoIp: "172.67.142.89",
    // Real confirmed Solana devnet transaction so the signature resolves on Solana Explorer.
    attestationHash:
      "28YZMTvtCqfNQakxzSBDH7MGwdc1tQNkXbadBoU9w2CBtU9BBv7VDHB5LyoH8yr4vpfcPr5FStmt5k2Z6dT7bZr5",
  },
  {
    id: "london-1",
    name: "London-1",
    region: "EU West",
    latency: 35,
    pricePerSession: 0.07,
    verified: true,
    humanLaneAvailable: false,
    trafficQualityScore: 91,
    botRiskScore: 18,
    uptime: 99.5,
    lastVerified: "2026-05-30T06:30:00Z",
    demoIp: "104.26.11.74",
    // Real confirmed Solana devnet transaction so the signature resolves on Solana Explorer.
    attestationHash:
      "AD2pNt86mPaPpz3KLBcBoGGRVNaJSGe1mL6jjNYzQoCmp3SVUNWarmbP4B34vYPwb361Vw9BptyuaysFRvve4dx",
  },
  {
    id: "frankfurt-1",
    name: "Frankfurt-1",
    region: "EU Central",
    latency: 31,
    pricePerSession: 0.08,
    verified: true,
    humanLaneAvailable: true,
    trafficQualityScore: 88,
    botRiskScore: 28,
    uptime: 98.9,
    lastVerified: "2026-05-30T05:55:00Z",
    demoIp: "188.114.97.3",
    // Real confirmed Solana devnet transaction so the signature resolves on Solana Explorer.
    attestationHash:
      "4FaKS7Q77GGMkxuoPx2DbFSCFiyjDusPQKQj2hBtBQmfjDnyHJpyGVfpXEBukYWR2dk6ZoqFT9Y15SaMAjmFmGpC",
  },
  {
    id: "tokyo-1",
    name: "Tokyo-1",
    region: "APAC",
    latency: 48,
    pricePerSession: 0.06,
    verified: false,
    humanLaneAvailable: true,
    trafficQualityScore: 82,
    botRiskScore: 35,
    uptime: 97.2,
    lastVerified: "2026-05-28T14:20:00Z",
    demoIp: "103.21.244.17",
    // Real confirmed Solana devnet transaction so the signature resolves on Solana Explorer.
    attestationHash:
      "4Fhyg3BvWLSSqzZmWubX4t6jaHG81k2aSH5b4iU8d2JjAymd9MkBYK1nokGtLkDGjChcEQzY9JeaAVqNHrjfXPs7",
  },
];

export const relayNodes: RelayNode[] = rawNodes.map((node) => ({
  ...node,
  trustScore: calculateTrustScore({
    uptime: node.uptime,
    latency: node.latency,
    trafficQualityScore: node.trafficQualityScore,
    botRiskScore: node.botRiskScore,
    verified: node.verified,
  }),
}));
