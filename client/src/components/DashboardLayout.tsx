import { Link, useLocation } from "wouter";

const navItems = [
  { label: "Scan", path: "/" },
  { label: "Findings", path: "/findings" },
  { label: "Approvals", path: "/approvals" },
  { label: "Audit", path: "/audit" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring">
            <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
            <span className="text-sm font-medium tracking-[-0.5px]">Nuvira</span>
          </Link>
          <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto">
            {navItems.map(item => {
              const active = item.path === "/" ? location === "/" : location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`inline-flex h-8 min-h-8 shrink-0 items-center rounded-2xl px-3 text-sm tracking-[-0.5px] focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-foreground text-background font-semibold" : "border border-transparent text-muted-foreground hover:border-border hover:text-foreground"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
