import { NextResponse } from "next/server";
import { AcumaticaClient } from "@/server/acumatica/client";
import { getConfig } from "@/server/config";
import { clearSessionCookie, readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await readSession();
  if (session?.mode === "live") {
    const client = new AcumaticaClient(getConfig(), session.cookieHeader);
    await client.logout();
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
