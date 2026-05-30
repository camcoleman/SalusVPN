import Navbar from "@/components/Navbar";
import StatsBanner from "@/components/StatsBanner";
import MarketplaceSection from "@/components/MarketplaceSection";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="animate-fade-up mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Trusted Infrastructure Verification
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Verify Before You Connect
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              Every VPN claims it protects your privacy. SalusVPN helps users
              verify and choose trusted infrastructure before connecting.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#marketplace"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent/90 sm:w-auto"
              >
                Explore Nodes
              </a>
              <a
                href="#stats"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border bg-surface px-6 text-sm font-semibold transition-colors hover:border-accent/40 hover:bg-surface-elevated sm:w-auto"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <div className="py-12 sm:py-16">
        <StatsBanner />
      </div>

      {/* Marketplace + Session Panel */}
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
    </div>
  );
}
