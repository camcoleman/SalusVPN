interface SessionFieldProps {
  label: string;
  value: React.ReactNode;
}

function SessionField({ label, value }: SessionFieldProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SessionPanel() {
  return (
    <aside
      id="session"
      className="rounded-xl border border-border bg-surface-elevated p-5 lg:sticky lg:top-24 lg:self-start"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted opacity-40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-muted" />
        </span>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-muted">
          Session Monitor
        </h2>
      </div>

      <div className="rounded-lg border border-border bg-background/50 p-4 font-mono">
        <SessionField label="Selected Node" value="None" />
        <SessionField
          label="Status"
          value={
            <span className="rounded-md bg-surface px-2 py-0.5 text-xs text-muted">
              Disconnected
            </span>
          }
        />
        <SessionField label="Session Cost" value="$0.00" />
        <SessionField label="Bandwidth Used" value="0 MB" />
        <SessionField label="Time Connected" value="00:00" />
      </div>

      <p className="mt-4 text-xs text-muted">
        Connect to a verified relay node to begin a session.
      </p>
    </aside>
  );
}
