import { NextRequest, NextResponse } from "next/server";
import { listGames, createManualGame } from "@/lib/repositories/gameRepository";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sortBy = (sp.get("sortBy") as "userRating" | "playtimeMinutes") || "playtimeMinutes";
  const order = (sp.get("order") as "asc" | "desc") || "desc";
  const platform = sp.get("platform") || undefined;

  const result = await listGames({ sortBy, order, platform });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const game = await createManualGame(body);
  return NextResponse.json(game, { status: 201 });
}
