import Link from "next/link";

function SalusMark() {
  return (
    <svg
      className="h-8 w-8 text-accent"
      viewBox="18 0 64 70"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <polygon
        points="50,3 78,14 78,52 50,67 22,52 22,14"
        fill="#1e1508"
        strokeWidth="1.3"
      />
      <polygon
        points="50,9 72,18.5 72,47.5 50,57 28,47.5 28,18.5"
        strokeOpacity="0.3"
        strokeWidth="0.6"
      />
      <line x1="22" y1="35" x2="78" y2="35" strokeOpacity="0.2" strokeWidth="0.5" />
      <line x1="50" y1="3" x2="50" y2="67" strokeOpacity="0.2" strokeWidth="0.5" />
      <path d="M38,22 L50,15 L62,22 L62,48 L50,55 L38,48 Z" strokeWidth="1.3" />
      <path d="M32,22 Q50,14 68,22" strokeOpacity="0.27" strokeWidth="0.6" />
      <path d="M32,48 Q50,56 68,48" strokeOpacity="0.27" strokeWidth="0.6" />
      <circle cx="50" cy="35" r="8" strokeWidth="0.7" />
      <line x1="50" y1="27" x2="50" y2="24" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="50" y1="43" x2="50" y2="46" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="42" y1="35" x2="39" y2="35" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="58" y1="35" x2="61" y2="35" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="50" cy="35" r="4.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

const navLinks = [
  { href: "#stats", label: "Stats" },
  { href: "#marketplace", label: "Nodes" },
  { href: "#session", label: "Session" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <SalusMark />
          <span className="text-lg font-semibold tracking-tight">
            Salus<span className="text-accent">VPN</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-elevated hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
