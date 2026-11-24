import { NextResponse } from "next/server";
import { AcumaticaClient } from "@/server/acumatica/client";
import { AcumaticaError } from "@/server/acumatica/errors";
import { getConfig } from "@/server/config";
import { applySessionCookie } from "@/server/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getConfig();
  if (config.demoOnly) {
    return NextResponse.json(
      { error: "This server is in demo mode. Continue in demo mode instead of signing in." },
      { status: 403 },
    );
  }
  if (!config.sessionSecret) {
    return NextResponse.json(
      { error: "Live sign-in is not configured yet. An administrator needs to set SESSION_SECRET." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
    tenant?: string;
  } | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const tenant = body?.tenant?.trim() ?? "";
  if (!username || !password || !tenant) {
    return NextResponse.json(
      { error: "Enter your Acumatica username, password, and tenant." },
      { status: 400 },
    );
  }
  if (!config.tenants.includes(tenant)) {
    return NextResponse.json({ error: "Choose a tenant from the list." }, { status: 400 });
  }

  try {
    const login = await AcumaticaClient.login(config, { username, password, tenant });
    const response = NextResponse.json({
      ok: true,
      mode: "live",
      username,
      tenant,
    });
    applySessionCookie(response, {
      mode: "live",
      username,
      tenant,
      cookieHeader: login.cookieHeader,
      createdAt: Date.now(),
    });
    return response;
  } catch (error) {
    const message = error instanceof AcumaticaError ? error.message : "Acumatica could not sign you in.";
    const status = error instanceof AcumaticaError && error.status >= 400 && error.status < 600 ? error.status : 502;
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : status >= 500 ? 502 : 400 });
  }
}
