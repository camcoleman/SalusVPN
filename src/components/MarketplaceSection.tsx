"use client";

import { useState } from "react";
import { relayNodes } from "@/data/relayNodes";
import NodeCard from "@/components/NodeCard";
import SessionPanel from "@/components/SessionPanel";

export default function MarketplaceSection() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode =
    relayNodes.find((node) => node.id === selectedNodeId) ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {relayNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={setSelectedNodeId}
            />
          ))}
        </div>
      </div>
      <SessionPanel selectedNode={selectedNode} />
    </div>
  );
}
