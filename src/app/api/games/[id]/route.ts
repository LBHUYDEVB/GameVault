import { NextRequest, NextResponse } from "next/server";
import { getGame, updateGameReview, deleteGame } from "@/lib/repositories/gameRepository";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await getGame(id);
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(game);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const allowed: { userRating?: number | null; reviewRichText?: string | null; status?: string | null } = {};
  if (body.userRating !== undefined) allowed.userRating = body.userRating;
  if (body.reviewRichText !== undefined) allowed.reviewRichText = body.reviewRichText;
  if (body.status !== undefined) allowed.status = body.status;

  const game = await updateGameReview(id, allowed);
  return NextResponse.json(game);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteGame(id);
  return NextResponse.json({ ok: true });
}
