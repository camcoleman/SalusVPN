"use client";

import Link from "next/link";
import WalletConnect from "@/components/WalletConnect";
import RelayMarketplace from "@/components/dashboard/RelayMarketplace";
import NodeMetricsPanel from "@/components/dashboard/NodeMetricsPanel";
import TrustScoreBreakdown from "@/components/dashboard/TrustScoreBreakdown";
import VerificationDetails from "@/components/dashboard/VerificationDetails";
import SessionHistoryPanel from "@/components/dashboard/SessionHistoryPanel";
import PaymentHistory from "@/components/dashboard/PaymentHistory";
import type { DashboardSection } from "@/types/dashboard";

const sections: { id: DashboardSection; label: string }[] = [
  { id: "marketplace", label: "Marketplace" },
  { id: "metrics", label: "Metrics" },
  { id: "trust", label: "Trust" },
  { id: "verification", label: "Verification" },
  { id: "sessions", label: "Sessions" },
  { id: "payments", label: "Payments" },
];

export default function DashboardShell() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-2 text-sm text-muted">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span>Dashboard</span>
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Relay Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Browse verified relays, inspect trust signals, and monitor sessions
            and payments.
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <WalletConnect />
        </div>
      </div>

      <nav className="sticky top-16 z-40 -mx-1 mb-8 overflow-x-auto border-b border-border bg-background/95 px-1 pb-px backdrop-blur-md">
        <div className="flex min-w-max gap-1">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-t-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="marketplace" className="scroll-mt-32 pb-16">
        <SectionHeader
          title="Relay Marketplace"
          description="Browse verified relay nodes and start a session."
        />
        <RelayMarketplace />
      </section>

      <section id="metrics" className="scroll-mt-32 pb-16">
        <SectionHeader
          title="Node Metrics"
          description="Performance and pricing signals for the selected relay."
        />
        <NodeMetricsPanel />
      </section>

      <div className="grid gap-8 pb-16 lg:grid-cols-2">
        <section id="trust" className="scroll-mt-32">
          <SectionHeader
            title="Trust Scores"
            description="Weighted breakdown of the composite trust rating."
          />
          <TrustScoreBreakdown />
        </section>

        <section id="verification" className="scroll-mt-32">
          <SectionHeader
            title="Verification Details"
            description="Attestation status and last verification timestamp."
          />
          <VerificationDetails />
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section id="sessions" className="scroll-mt-32">
          <SectionHeader
            title="Session History"
            description="Recently completed relay sessions."
          />
          <SessionHistoryPanel />
        </section>

        <section id="payments" className="scroll-mt-32">
          <SectionHeader
            title="Payment History"
            description="USDC settlement records from ended sessions."
          />
          <PaymentHistory />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
