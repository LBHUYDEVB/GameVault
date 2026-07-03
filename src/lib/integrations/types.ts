export interface ExternalGame {
  externalId: string;
  title: string;
  playtimeMinutes: number;
  recentPlaytimeMinutes?: number | null;
  recentPlaytimeSource?: string | null;
  coverUrl?: string;
}

export type IntegrationStatus =
  | { ok: true; platform: string }
  | { ok: false; platform: string; reason: string };

export interface IntegrationPort {
  readonly platform: string;
  fetchOwnedGames(accountId: string, apiKey?: string): Promise<ExternalGame[]>;
  healthcheck(): Promise<IntegrationStatus>;
}
