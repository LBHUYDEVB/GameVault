import { NextResponse } from "next/server";
import { getIntegrationStatuses } from "@/lib/integrations/statusService";

export async function GET() {
  return NextResponse.json({ platforms: await getIntegrationStatuses() });
}
