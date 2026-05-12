import { Link, useLocation } from "wouter";
import { Terminal, Box, Activity } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2 text-primary font-bold text-lg uppercase tracking-wider">
          <Terminal className="w-5 h-5" />
          <span>WSA HUB</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-secondary hover:text-foreground ${
              location === "/" ? "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/products"
            className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-secondary hover:text-foreground ${
              location === "/products" ? "bg-primary text-primary-foreground font-bold hover:bg-primary hover:text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Box className="w-4 h-4" />
            Products
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8 relative">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
        {children}
      </main>
    </div>
  );
}
