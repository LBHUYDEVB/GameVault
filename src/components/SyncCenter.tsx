"use client";

import { useMemo, useState, useTransition } from "react";
import type { IntegrationStatusItem } from "@/lib/integrations/statusService";
import { minutesToHours } from "@/lib/utils";

interface ActionResult {
  platform?: string;
  ok?: boolean;
  message?: string | null;
  error?: string;
  url?: string;
  results?: Array<{ platform: string; ok: boolean; message: string | null; syncedCount: number; updatedCount: number }>;
}

function formatDate(value: string | null) {
  if (!value) return "尚无记录";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function readJson(response: Response): Promise<ActionResult> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || `HTTP ${response.status}` };
  }
}

export function SyncCenter({ initialStatuses }: { initialStatuses: IntegrationStatusItem[] }) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const summary = useMemo(() => {
    const configured = statuses.filter((status) => status.configured).length;
    const failed = statuses.filter((status) => status.lastError).length;
    const games = statuses.reduce((sum, status) => sum + status.gameCount, 0);
    return { configured, failed, games };
  }, [statuses]);

  const refreshStatuses = async () => {
    const response = await fetch("/api/integrations/status");
    const data = await response.json();
    setStatuses(data.platforms);
  };

  const runAction = (action: () => Promise<ActionResult>) => {
    setActiveMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.results) {
        setActiveMessage(
          result.results
            .map((item) => `${item.platform}: ${item.ok ? `新增 ${item.syncedCount}，更新 ${item.updatedCount}` : item.message || "失败"}`)
            .join(" / ")
        );
      } else {
        setActiveMessage(result.error || result.message || (result.ok ? "操作完成" : "操作失败"));
      }
      await refreshStatuses();
    });
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="已配置平台" value={`${summary.configured}/3`} />
        <SummaryCard label="同步游戏" value={`${summary.games} 款`} />
        <SummaryCard label="异常平台" value={`${summary.failed}`} tone={summary.failed ? "error" : "success"} />
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(async () => readJson(await fetch("/api/sync/all", { method: "POST" })))}
          className="rounded-lg border border-neon-cyan bg-neon-cyan px-4 py-5 text-left text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          <span className="block text-xs uppercase tracking-[0.18em]">Sync all</span>
          <span className="mt-2 block text-2xl font-semibold">{isPending ? "运行中" : "全部同步"}</span>
        </button>
      </div>

      {activeMessage && (
        <div className="rounded-lg border border-border bg-[var(--bg-card)] p-4 text-sm text-text-secondary">
          {activeMessage}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {statuses.map((status) => (
          <PlatformCredentialCard
            key={status.platform}
            status={status}
            pending={isPending}
            onAction={runAction}
          />
        ))}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone?: "success" | "error" }) {
  return (
    <div className="rounded-lg border border-border bg-[var(--bg-card)] p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className={`mt-3 font-mono text-3xl font-semibold ${tone === "error" ? "text-[var(--color-error)]" : tone === "success" ? "text-[var(--color-success)]" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function PlatformCredentialCard({
  status,
  pending,
  onAction,
}: {
  status: IntegrationStatusItem;
  pending: boolean;
  onAction: (action: () => Promise<ActionResult>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [nintendoRedirectUrl, setNintendoRedirectUrl] = useState("");

  const endpoint = `/api/settings/${status.platform}`;

  const saveCredential = async () => {
    const body =
      status.platform === "steam"
        ? { steamId: form.steamId, apiKey: form.apiKey }
        : status.platform === "playstation"
          ? { npsso: form.npsso, refreshToken: form.refreshToken }
          : { sessionToken: form.sessionToken };
    return readJson(
      await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  };

  const completeNintendo = async () =>
    readJson(
      await fetch("/api/integrations/nintendo/bootstrap/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUrl: nintendoRedirectUrl }),
      })
    );

  const startAuthorization = async () => {
    const popup = window.open("about:blank", "_blank");
    const result = await readJson(
      await fetch(`/api/integrations/${status.platform}/bootstrap/start`, { method: "POST" })
    );

    if (result.url && popup) {
      popup.opener = null;
      popup.location.replace(result.url);
    } else {
      popup?.close();
    }

    return result;
  };

  return (
    <article className="rounded-xl border border-border bg-[var(--bg-card)] p-5 transition-all hover:border-neon-cyan/40 hover:shadow-[var(--glow-cyan)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{status.platform}</p>
          <h2 className="mt-2 text-2xl font-semibold">{status.label}</h2>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{status.description}</p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
            status.configured
              ? "border-[var(--color-success)]/35 text-[var(--color-success)]"
              : "border-[var(--color-warning)]/35 text-[var(--color-warning)]"
          }`}
        >
          {status.configured ? "已配置" : "缺凭证"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <StatusFact label="游戏" value={`${status.gameCount} 款`} />
        <StatusFact label="时长" value={minutesToHours(status.playtimeMinutes)} />
        <StatusFact label="同步" value={formatDate(status.lastSyncAt)} />
        <StatusFact label="校验" value={status.credentialStatus} />
      </div>

      <div className="mt-5 rounded-md border border-border bg-black/15 p-3">
        <p className="text-xs text-text-muted">凭证</p>
        <p className="mt-1 text-sm text-text-secondary">{status.maskedCredential}</p>
      </div>

      {status.lastError && (
        <div className="mt-4 rounded-md border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          {status.lastError}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction(async () => readJson(await fetch(`/api/integrations/${status.platform}/validate`, { method: "POST" })))}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-60"
        >
          验证
        </button>
        <button
          type="button"
          disabled={pending || !status.configured}
          onClick={() => onAction(async () => readJson(await fetch(`/api/sync/${status.platform}`, { method: "POST" })))}
          className="rounded-md border border-neon-cyan bg-neon-cyan px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          同步
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAction(startAuthorization)}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-60"
        >
          启动授权
        </button>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan"
        >
          替换凭证
        </button>
      </div>

      {open && (
        <div className="mt-5 space-y-3 rounded-lg border border-border bg-black/15 p-4">
          {status.platform === "steam" && (
            <>
              <CredentialInput label="Steam ID" value={form.steamId ?? ""} onChange={(value) => setForm((current) => ({ ...current, steamId: value }))} />
              <CredentialInput label="API Key" value={form.apiKey ?? ""} onChange={(value) => setForm((current) => ({ ...current, apiKey: value }))} password />
            </>
          )}
          {status.platform === "playstation" && (
            <>
              <CredentialInput label="NPSSO" value={form.npsso ?? ""} onChange={(value) => setForm((current) => ({ ...current, npsso: value }))} password />
              <CredentialInput label="Refresh Token 可选" value={form.refreshToken ?? ""} onChange={(value) => setForm((current) => ({ ...current, refreshToken: value }))} password />
            </>
          )}
          {status.platform === "nintendo" && (
            <>
              <CredentialInput label="Session Token" value={form.sessionToken ?? ""} onChange={(value) => setForm((current) => ({ ...current, sessionToken: value }))} password />
              <CredentialInput label="Nintendo 授权返回链接" value={nintendoRedirectUrl} onChange={setNintendoRedirectUrl} />
              <button
                type="button"
                disabled={pending || !nintendoRedirectUrl.trim()}
                onClick={() => onAction(completeNintendo)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:border-neon-cyan hover:text-neon-cyan disabled:opacity-60"
              >
                换取 Session Token
              </button>
            </>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => onAction(saveCredential)}
            className="w-full rounded-md bg-neon-cyan px-3 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            保存替换
          </button>
        </div>
      )}
    </article>
  );
}

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-black/15 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 truncate font-mono text-sm">{value}</p>
    </div>
  );
}

function CredentialInput({
  label,
  value,
  onChange,
  password = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  password?: boolean;
}) {
  return (
    <label className="block space-y-2 text-sm text-text-secondary">
      <span>{label}</span>
      <input
        type={password ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-border bg-[var(--bg-input)] px-3 py-2 text-foreground outline-none focus:border-neon-cyan"
      />
    </label>
  );
}
