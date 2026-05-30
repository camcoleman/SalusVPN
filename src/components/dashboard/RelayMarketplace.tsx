"use client";

import { useSessionSelection } from "@/context/SessionSelectionContext";
import { relayNodes } from "@/data/relayNodes";
import NodeCard from "@/components/NodeCard";
import SessionPanel from "@/components/SessionPanel";

export default function RelayMarketplace() {
  const { selectedNodeId, selectedNode, selectNode } = useSessionSelection();

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {relayNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={selectNode}
            />
          ))}
        </div>
      </div>
      <div>
        <SessionPanel selectedNode={selectedNode} />
      </div>
    </div>
  );
}
