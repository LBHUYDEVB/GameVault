import { NextRequest, NextResponse } from "next/server";
import { deleteGameList, getGameList, updateGameList } from "@/lib/repositories/activityRepository";

async function readBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await getGameList(id);
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(list);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const list = await updateGameList(id, await readBody(req));
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update list" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteGameList(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete list" }, { status: 400 });
  }
}
