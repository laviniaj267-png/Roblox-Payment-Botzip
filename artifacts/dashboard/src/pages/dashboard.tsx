import { useGetStats, useHealthCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { Activity, ShieldCheck, Ticket, Box } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: health, isLoading: healthLoading } = useHealthCheck();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-primary">System Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time bot statistics and health status.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-none border-border bg-card shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border mb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Bot Status</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {healthLoading || statsLoading ? (
                <Skeleton className="h-8 w-[100px] bg-secondary" />
              ) : (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${stats?.botOnline ? "bg-accent shadow-[0_0_8px_var(--color-accent)]" : "bg-destructive shadow-[0_0_8px_var(--color-destructive)]"}`} />
                  <div className="text-2xl font-bold">{stats?.botOnline ? "ONLINE" : "OFFLINE"}</div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">
                API: {healthLoading ? "..." : health?.status === "ok" ? "Healthy" : "Degraded"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border mb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Active Products</CardTitle>
              <Box className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-[60px] bg-secondary" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{stats?.productCount ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-border bg-card shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-border mb-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Active Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-[60px] bg-secondary" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{stats?.activeTickets ?? 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-none border-border bg-card shadow-none">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg uppercase tracking-wide text-primary">System Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-2 text-xs font-mono text-muted-foreground">
                <div>&gt; System initialized... OK</div>
                <div>&gt; Connected to Discord gateway... OK</div>
                <div>&gt; Loading products from database... OK</div>
                <div>&gt; Listening for purchase verifications...</div>
                <div className="animate-pulse text-primary">_</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
