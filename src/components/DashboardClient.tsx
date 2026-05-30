"use client";

import { SessionSelectionProvider, useSessionSelection } from "@/context/SessionSelectionContext";
import MarketplaceSection from "@/components/MarketplaceSection";
import TrustAdvisorPanel from "@/components/TrustAdvisor/TrustAdvisorPanel";

function TrustAdvisorPanelWithSelection() {
  const { selectNode } = useSessionSelection();
  return <TrustAdvisorPanel onSelectNode={selectNode} />;
}

export default function DashboardClient() {
  return (
    <SessionSelectionProvider>
      <section
        id="advisor"
        className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <TrustAdvisorPanelWithSelection />
      </section>

      <section
        id="marketplace"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8"
      >
        <div className="mb-8 lg:mb-10">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Relay Marketplace
          </h2>
          <p className="mt-2 max-w-2xl text-muted">
            Browse verified relay nodes with transparent trust scores, traffic
            quality metrics, and attestation data.
          </p>
        </div>

        <MarketplaceSection />
      </section>
    </SessionSelectionProvider>
  );
}
