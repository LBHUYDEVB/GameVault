import { prisma } from "@/lib/db";
import {
  isCredentialConfigured,
  maskedCredential,
} from "./credentials";
import { PLATFORM_META, PLATFORMS, type Platform } from "./platforms";

export interface IntegrationStatusItem {
  platform: Platform;
  label: string;
  description: string;
  accent: string;
  configured: boolean;
  credentialStatus: string;
  syncStatus: string;
  maskedCredential: string;
  accountId: string;
  lastSyncAt: string | null;
  lastCheckedAt: string | null;
  tokenExpiresAt: string | null;
  lastError: string | null;
  gameCount: number;
  playtimeMinutes: number;
  lastJob: {
    status: string;
    message: string | null;
    startedAt: string;
    finishedAt: string | null;
  } | null;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function getIntegrationStatuses(): Promise<IntegrationStatusItem[]> {
  const [accounts, gameStats, latestJobs] = await Promise.all([
    prisma.platformAccount.findMany(),
    prisma.game.groupBy({
      by: ["platform"],
      _count: { _all: true },
      _sum: { playtimeMinutes: true },
    }),
    Promise.all(
      PLATFORMS.map((platform) =>
        prisma.syncJob.findFirst({
          where: { platform },
          orderBy: { startedAt: "desc" },
        })
      )
    ),
  ]);

  return PLATFORMS.map((platform, index) => {
    const account = accounts.find((item) => item.platform === platform);
    const stats = gameStats.find((item) => item.platform === platform);
    const job = latestJobs[index];
    const meta = PLATFORM_META[platform];
    const configured = isCredentialConfigured(platform, account);

    return {
      platform,
      label: meta.label,
      description: meta.description,
      accent: meta.accent,
      configured,
      credentialStatus: account?.credentialStatus ?? (configured ? "unknown" : "missing"),
      syncStatus: account?.syncStatus ?? "idle",
      maskedCredential: maskedCredential(platform, account),
      accountId: account?.accountId ?? "",
      lastSyncAt: toIso(account?.lastSyncAt),
      lastCheckedAt: toIso(account?.lastCheckedAt),
      tokenExpiresAt: toIso(account?.tokenExpiresAt),
      lastError: account?.lastError || (job?.status === "failed" ? job.message : null),
      gameCount: stats?._count._all ?? 0,
      playtimeMinutes: stats?._sum.playtimeMinutes ?? 0,
      lastJob: job
        ? {
            status: job.status,
            message: job.message,
            startedAt: toIso(job.startedAt)!,
            finishedAt: toIso(job.finishedAt),
          }
        : null,
    };
  });
}
