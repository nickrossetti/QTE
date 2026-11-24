import { NextResponse } from "next/server";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  return NextResponse.json({
    mode: session.mode,
    username: session.username,
    tenant: session.tenant,
  });
}
