import { SyncCenter } from "@/components/SyncCenter";
import { getIntegrationStatuses } from "@/lib/integrations/statusService";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const statuses = await getIntegrationStatuses();

  return (
    <div className="min-h-screen px-4 pt-20 md:px-8 md:pt-8">
      <div className="mx-auto max-w-7xl space-y-8 pb-20">
        <section className="rounded-xl border border-border bg-[var(--bg-secondary)] px-5 py-8 md:px-8">
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">平台同步中心</h1>
        </section>
        <SyncCenter initialStatuses={statuses} />
      </div>
    </div>
  );
}
