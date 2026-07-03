import { NextResponse } from "next/server";
import { isPlatform } from "@/lib/integrations/platforms";
import { validatePlatform } from "@/lib/integrations/syncService";

export async function POST(_req: Request, ctx: RouteContext<"/api/integrations/[platform]/validate">) {
  const { platform } = await ctx.params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 404 });
  }

  const result = await validatePlatform(platform);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
