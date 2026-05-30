/**
 * Mock data source for the AI-Powered Trust Advisor.
 *
 * This module is the single "swap point" the feature depends on. Today it
 * returns hard-coded mock relay nodes; tomorrow you can replace the body of
 * `getRelayNodes()` with a real fetch/DB call WITHOUT touching the Gemini
 * wrapper or any UI component, because they only ever import from here.
 *
 * Why re-export the dataset from `@/data/relayNodes` instead of re-listing the
 * nodes here: the app already ships that dataset (with trust scores computed by
 * `lib/trustScore.ts`). Duplicating the rows would let the two copies drift, so
 * we keep one source of values and treat THIS file as the access boundary.
 */
import { relayNodes } from "@/data/relayNodes";
import type { RelayNode } from "@/types/trustAdvisor";

/**
 * The raw mock node list. Exported for tests/components that just need the
 * data synchronously. Prefer `getRelayNodes()` for anything that might later
 * talk to a real (async) backend.
 */
export const mockNodes: RelayNode[] = relayNodes;

/**
 * Returns the relay nodes the advisor should evaluate.
 *
 * Async on purpose: real relay data will come from a network/DB call, so making
 * the contract async now means the swap to live data won't ripple out into
 * callers (they already `await` it).
 */
export async function getRelayNodes(): Promise<RelayNode[]> {
  return mockNodes;
}

/**
 * Convenience lookup used after Gemini returns a node id, so the UI can show
 * full node details next to the recommendation. Returns `undefined` if the id
 * doesn't match any known node (e.g. the model hallucinated an id).
 */
export function getNodeById(id: string): RelayNode | undefined {
  return mockNodes.find((node) => node.id === id);
}
