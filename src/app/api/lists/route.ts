import { NextRequest, NextResponse } from "next/server";
import { createGameList, listGameLists } from "@/lib/repositories/activityRepository";

async function readBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  const lists = await listGameLists();
  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  try {
    const list = await createGameList(await readBody(req));
    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create list" }, { status: 400 });
  }
}
