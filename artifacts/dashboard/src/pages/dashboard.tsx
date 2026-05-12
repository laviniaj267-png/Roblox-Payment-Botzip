import { useState } from "react";
import { useGetStats, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { Activity, Ticket, Box, ChevronDown } from "lucide-react";

function CollapsibleCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="rounded-none border-border bg-card shadow-none">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border mb-2 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: health, isLoading: healthLoading } = useHealthCheck();

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-primary">
            System Overview
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time bot statistics and health status.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CollapsibleCard title="Bot Status" icon={Activity}>
            {healthLoading || statsLoading ? (
              <Skeleton className="h-8 w-[100px] bg-secondary" />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    stats?.botOnline
                      ? "bg-accent shadow-[0_0_8px_var(--color-accent)]"
                      : "bg-destructive shadow-[0_0_8px_var(--color-destructive)]"
                  }`}
                />
                <div className="text-2xl font-bold">
                  {stats?.botOnline ? "ONLINE" : "OFFLINE"}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
              API:{" "}
              {healthLoading
                ? "..."
                : health?.status === "ok"
                  ? "Healthy"
                  : "Degraded"}
            </p>
          </CollapsibleCard>

          <CollapsibleCard title="Active Products" icon={Box}>
            {statsLoading ? (
              <Skeleton className="h-8 w-[60px] bg-secondary" />
            ) : (
              <div className="text-3xl font-bold text-foreground">
                {stats?.productCount ?? 0}
              </div>
            )}
          </CollapsibleCard>

          <CollapsibleCard title="Active Tickets" icon={Ticket}>
            {statsLoading ? (
              <Skeleton className="h-8 w-[60px] bg-secondary" />
            ) : (
              <div className="text-3xl font-bold text-foreground">
                {stats?.activeTickets ?? 0}
              </div>
            )}
          </CollapsibleCard>
        </div>

        <CollapsibleCard title="System Logs" icon={Activity}>
          <div className="space-y-2 text-xs font-mono text-muted-foreground">
            <div>&gt; System initialized... OK</div>
            <div>&gt; Connected to Discord gateway... OK</div>
            <div>&gt; Loading products from database... OK</div>
            <div>&gt; Listening for purchase verifications...</div>
            <div className="animate-pulse text-primary">_</div>
          </div>
        </CollapsibleCard>
      </div>
    </Layout>
  );
}
