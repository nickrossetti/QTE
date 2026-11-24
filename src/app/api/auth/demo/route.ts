import { NextResponse } from "next/server";
import { getConfig } from "@/server/config";
import { applySessionCookie } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getConfig();
  const body = (await request.json().catch(() => ({}))) as { tenant?: string; username?: string };
  const tenant = body.tenant?.trim() || config.tenants[0] || "Quality Track Equipment";
  const username = (body.username?.trim() || "Demo estimator").slice(0, 80);
  const response = NextResponse.json({ ok: true, mode: "demo", username, tenant });
  applySessionCookie(response, {
    mode: "demo",
    username,
    tenant,
    createdAt: Date.now(),
  });
  return response;
}
