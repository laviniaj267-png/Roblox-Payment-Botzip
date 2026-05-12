import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Terminal, Box, Activity, Menu, X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/products", label: "Products", icon: Box },
];

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card flex flex-col
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-lg uppercase tracking-wider">
            <Terminal className="w-5 h-5 shrink-0" />
            <span>NEXXI HUB</span>
          </div>
          <button
            className="md:hidden text-muted-foreground hover:text-foreground p-1"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-primary font-bold text-base uppercase tracking-wider">
            <Terminal className="w-4 h-4" />
            <span>NEXXI HUB</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
          {children}
        </main>
      </div>
    </div>
  );
}
