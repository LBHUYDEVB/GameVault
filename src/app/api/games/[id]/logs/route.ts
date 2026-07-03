import { NextRequest, NextResponse } from "next/server";
import { createGameLog, listGameLogs } from "@/lib/repositories/activityRepository";

async function readBody(req: NextRequest) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logs = await listGameLogs(id);
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const log = await createGameLog(id, await readBody(req));
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create log" }, { status: 400 });
  }
}
