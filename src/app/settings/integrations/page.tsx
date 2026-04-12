"use client";

import { useState, useEffect } from "react";

interface SyncState {
  syncing: boolean;
  result: string | null;
}

async function doSync(url: string): Promise<string> {
  const res = await fetch(url, { method: "POST" });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { error: text || "空响应" }; }
  if (res.ok) return `同步成功：新增 ${data.syncedCount} 款，更新 ${data.updatedCount} 款`;
  return `同步失败：${data.error || `HTTP ${res.status}`}`;
}

export default function IntegrationsPage() {
  // Steam
  const [steamId, setSteamId] = useState("");
  const [steamKey, setSteamKey] = useState("");
  const [steamSync, setSteamSync] = useState<SyncState>({ syncing: false, result: null });
  const [steamSaving, setSteamSaving] = useState(false);

  // PlayStation
  const [psnNpsso, setPsnNpsso] = useState("");
  const [psnSync, setPsnSync] = useState<SyncState>({ syncing: false, result: null });
  const [psnSaving, setPsnSaving] = useState(false);

  // Nintendo
  const [nsToken, setNsToken] = useState("");
  const [nsSync, setNsSync] = useState<SyncState>({ syncing: false, result: null });
  const [nsSaving, setNsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/steam").then(r => r.json()).then(d => { setSteamId(d.steamId ?? ""); setSteamKey(d.apiKey ?? ""); }).catch(() => {});
    fetch("/api/settings/playstation").then(r => r.json()).then(d => { setPsnNpsso(d.npsso ?? ""); }).catch(() => {});
    fetch("/api/settings/nintendo").then(r => r.json()).then(d => { setNsToken(d.sessionToken ?? ""); }).catch(() => {});
  }, []);

  const saveSteam = async () => { setSteamSaving(true); await fetch("/api/settings/steam", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ steamId, apiKey: steamKey }) }); setSteamSaving(false); };
  const savePsn = async () => { setPsnSaving(true); await fetch("/api/settings/playstation", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ npsso: psnNpsso }) }); setPsnSaving(false); };
  const saveNs = async () => { setNsSaving(true); await fetch("/api/settings/nintendo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionToken: nsToken }) }); setNsSaving(false); };

  const syncSteam = async () => { setSteamSync({ syncing: true, result: null }); await saveSteam(); const r = await doSync("/api/sync/steam"); setSteamSync({ syncing: false, result: r }); };
  const syncPsn = async () => { setPsnSync({ syncing: true, result: null }); await savePsn(); const r = await doSync("/api/sync/playstation"); setPsnSync({ syncing: false, result: r }); };
  const syncNs = async () => { setNsSync({ syncing: true, result: null }); await saveNs(); const r = await doSync("/api/sync/nintendo"); setNsSync({ syncing: false, result: r }); };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-mono tracking-wide neon-text">平台接入</h1>
        <p className="text-text-secondary text-sm mt-1">配置游戏平台账号与数据同步</p>
      </div>

      {/* Steam */}
      <PlatformCard
        icon="🎮" name="Steam" subtitle="官方 API 直连" status="available"
        fields={[
          { label: "Steam ID (64-bit)", value: steamId, onChange: setSteamId, placeholder: "76561198xxxxxxxxx" },
          { label: "API Key", value: steamKey, onChange: setSteamKey, placeholder: "从 steamcommunity.com/dev/apikey 获取", password: true },
        ]}
        onSave={saveSteam} saving={steamSaving}
        onSync={syncSteam} syncing={steamSync.syncing} canSync={!!steamId && !!steamKey}
        syncResult={steamSync.result}
      />

      {/* PlayStation */}
      <PlatformCard
        icon="🎯" name="PlayStation" subtitle="非官方 API（NPSSO 登录态）" status="available"
        fields={[
          { label: "NPSSO Token", value: psnNpsso, onChange: setPsnNpsso, placeholder: "从 PlayStation 官网获取（有效期 60 天）", password: true },
        ]}
        onSave={savePsn} saving={psnSaving}
        onSync={syncPsn} syncing={psnSync.syncing} canSync={!!psnNpsso}
        syncResult={psnSync.result}
        helpText="获取方式：登录 PlayStation 官网 → 访问 https://ca.account.sony.com/api/v1/ssocookie → 复制 npsso 值。"
      />

      {/* Nintendo */}
      <PlatformCard
        icon="🕹️" name="Nintendo" subtitle="非官方 API（Session Token 登录态）" status="available"
        fields={[
          { label: "Session Token", value: nsToken, onChange: setNsToken, placeholder: "通过任天堂 OAuth 获取（有效期 2 年）", password: true },
        ]}
        onSave={saveNs} saving={nsSaving}
        onSync={syncNs} syncing={nsSync.syncing} canSync={!!nsToken}
        syncResult={nsSync.result}
        helpText="获取方式较复杂，需要通过任天堂账号 OAuth 授权流程获取 session_token。可参考项目文档。"
      />
    </div>
  );
}

// ─── Shared Card Component ───

interface FieldDef {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  password?: boolean;
}

function PlatformCard({
  icon, name, subtitle, status, fields,
  onSave, saving, onSync, syncing, canSync, syncResult, helpText,
}: {
  icon: string; name: string; subtitle: string; status: "available" | "pending";
  fields: FieldDef[];
  onSave: () => void; saving: boolean;
  onSync: () => void; syncing: boolean; canSync: boolean;
  syncResult: string | null;
  helpText?: string;
}) {
  const isPending = status === "pending";

  return (
    <div className={`neon-card p-6 mb-6 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h2 className="font-mono font-bold text-lg">{name}</h2>
            <p className="text-xs text-text-secondary font-mono">{subtitle}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded text-xs font-mono border ${
          isPending
            ? "border-[var(--color-warning)]/30 text-[var(--color-warning)] bg-[var(--color-warning)]/10"
            : "border-[var(--color-success)]/30 text-[var(--color-success)] bg-[var(--color-success)]/10"
        }`}>
          {isPending ? "待接入" : "可用"}
        </span>
      </div>

      {!isPending && (
        <>
          <div className="space-y-4 mb-5">
            {fields.map((f) => (
              <div key={f.label}>
                <label className="text-xs font-mono text-text-secondary block mb-1">{f.label}</label>
                <input
                  type={f.password ? "password" : "text"}
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-[var(--bg-input)] text-foreground font-mono text-sm focus:border-neon-cyan focus:outline-none transition-colors"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>

          {helpText && (
            <p className="text-xs text-text-muted font-mono mb-4 leading-relaxed">
              💡 {helpText}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 rounded-md border border-border text-sm font-mono text-text-secondary hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存凭证"}
            </button>
            <button
              onClick={onSync}
              disabled={syncing || !canSync}
              className="px-4 py-2 rounded-md bg-neon-cyan/15 border border-neon-cyan/50 text-neon-cyan text-sm font-mono hover:bg-neon-cyan/25 transition-colors disabled:opacity-50"
            >
              {syncing ? "同步中..." : "▶ 同步游戏数据"}
            </button>
          </div>

          {syncResult && (
            <div className={`mt-4 px-4 py-3 rounded-md border text-sm font-mono ${
              syncResult.includes("成功")
                ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "border-[var(--color-error)]/30 bg-[var(--color-error)]/10 text-[var(--color-error)]"
            }`}>
              {syncResult}
            </div>
          )}
        </>
      )}
    </div>
  );
}
