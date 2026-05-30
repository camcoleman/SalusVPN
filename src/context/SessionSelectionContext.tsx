"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { relayNodes } from "@/data/relayNodes";
import type { RelayNode } from "@/data/relayNodes";

interface SessionSelectionContextValue {
  selectedNodeId: string | null;
  selectedNode: RelayNode | null;
  selectNode: (nodeId: string) => void;
}

const SessionSelectionContext =
  createContext<SessionSelectionContextValue | null>(null);

export function SessionSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const selectedNode = useMemo(
    () => relayNodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId]
  );

  const value = useMemo(
    () => ({ selectedNodeId, selectedNode, selectNode }),
    [selectedNodeId, selectedNode, selectNode]
  );

  return (
    <SessionSelectionContext.Provider value={value}>
      {children}
    </SessionSelectionContext.Provider>
  );
}

export function useSessionSelection(): SessionSelectionContextValue {
  const context = useContext(SessionSelectionContext);
  if (!context) {
    throw new Error(
      "useSessionSelection must be used within SessionSelectionProvider"
    );
  }
  return context;
}
