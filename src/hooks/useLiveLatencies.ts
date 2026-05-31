"use client";

import { useEffect, useState } from "react";
import type { RelayNode } from "@/data/relayNodes";

/**
 * Returns a live-updating map of `nodeId -> latency (ms)`.
 *
 * Each node's latency oscillates by a small random variance (±3ms) around its
 * static base value every `intervalMs`, simulating real network jitter for the
 * demo. The base is captured once on mount so the variance always tracks the
 * node's true baseline rather than drifting over time.
 */
export function useLiveLatencies(
  nodes: RelayNode[],
  intervalMs = 3000,
  variance = 3
): Record<string, number> {
  const [latencies, setLatencies] = useState<Record<string, number>>(() =>
    Object.fromEntries(nodes.map((node) => [node.id, node.latency]))
  );

  useEffect(() => {
    const bases = Object.fromEntries(
      nodes.map((node) => [node.id, node.latency])
    );

    const tick = () => {
      setLatencies(
        Object.fromEntries(
          Object.entries(bases).map(([id, base]) => {
            const delta = Math.round((Math.random() * 2 - 1) * variance);
            return [id, Math.max(1, base + delta)];
          })
        )
      );
    };

    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
    // `nodes` is the static module-level list; re-run only if it changes shape.
  }, [nodes, intervalMs, variance]);

  return latencies;
}
