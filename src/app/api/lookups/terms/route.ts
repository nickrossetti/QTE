import { NextResponse } from "next/server";
import { AcumaticaClient } from "@/server/acumatica/client";
import { AcumaticaError } from "@/server/acumatica/errors";
import { getConfig } from "@/server/config";
import { demoTerms } from "@/server/demo-data";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    if (session.mode === "demo") return NextResponse.json(demoTerms(q));
    const client = new AcumaticaClient(getConfig(), session.cookieHeader);
    return NextResponse.json(await client.searchTerms(q));
  } catch (error) {
    const message = error instanceof AcumaticaError ? error.message : "The terms lookup failed. Try again.";
    const status = error instanceof AcumaticaError && error.status === 401 ? 401 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
