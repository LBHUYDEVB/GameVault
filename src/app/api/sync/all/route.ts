import { NextResponse } from "next/server";
import { syncAllPlatforms } from "@/lib/integrations/syncService";

export async function POST() {
  const results = await syncAllPlatforms();
  const ok = results.every((result) => result.ok);
  return NextResponse.json({ ok, results }, { status: ok ? 200 : 207 });
}
