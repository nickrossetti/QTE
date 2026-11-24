import { NextResponse } from "next/server";
import { isDraft } from "@/domain/draft";
import { validateAll } from "@/domain/validation";
import { AcumaticaError, PartialSubmitError } from "@/server/acumatica/errors";
import { getConfig } from "@/server/config";
import { readSession } from "@/server/session";
import { submitDemo, submitLive } from "@/server/submit-quote";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!isDraft(body)) {
    return NextResponse.json({ error: "This quote could not be read. Go back and check each step." }, { status: 400 });
  }
  const errors = validateAll(body);
  if (errors.length) {
    return NextResponse.json(
      {
        error: errors[0]?.message ?? "Some required fields are missing.",
        errors,
      },
      { status: 400 },
    );
  }

  const config = getConfig();
  try {
    const result =
      session.mode === "demo"
        ? submitDemo(config, body)
        : await submitLive(config, session.cookieHeader, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PartialSubmitError) {
      return NextResponse.json({ error: error.message, created: error.created }, { status: 409 });
    }
    const message = error instanceof AcumaticaError ? error.message : "Acumatica could not save this quote.";
    const status = error instanceof AcumaticaError && error.status === 401 ? 401 : 502;
    console.error("Quote submit failed", status, message);
    return NextResponse.json({ error: message }, { status });
  }
}
