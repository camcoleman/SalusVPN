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
    attestationHash:
      "0x7f3a9c2e1b8d4f6a0e5c3b9d7a1f4e8c2b6d0a9f3e7c1b5d8a2f6e0c4b8a1d5",
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
    attestationHash:
      "0x2c8e1f4a6b0d3e7c9a2f5b8d1e4a7c0f3b6d9e2a5c8f1b4e7a0d3c6f9b2e5a8",
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
    attestationHash:
      "0x9a3f7e1c5b8d2a6f0e4c7b1d5a9f3e6c0b4d8a2f5e9c3b7d1a4f8e2c6b0d4a8",
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
    attestationHash:
      "0x4d8a2f6e0c3b7d1a5f9e3c7b0d4a8f2e6c1b5d9a3f7e0c4b8d2a6f1e5c9b3d7",
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
    attestationHash:
      "0x1e5c9b3d7a2f6e0c4b8d1a5f9e3c7b0d4a8f2e6c1b5d9a3f7e0c4b8d2a6f1e5",
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
