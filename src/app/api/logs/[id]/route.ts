import { NextRequest, NextResponse } from "next/server";
import { deleteGameLog, updateGameLog } from "@/lib/repositories/activityRepository";

async function readBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const log = await updateGameLog(id, await readBody(req));
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update log" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteGameLog(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete log" }, { status: 400 });
  }
}
