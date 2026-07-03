import { NextResponse } from "next/server";
import { syncPlatform } from "@/lib/integrations/syncService";

export async function POST() {
  const result = await syncPlatform("playstation");
  if (!result.ok) return NextResponse.json({ error: result.message, ...result }, { status: 500 });
  return NextResponse.json(result);
}
