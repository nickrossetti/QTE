import { NextResponse } from "next/server";
import { AcumaticaClient } from "@/server/acumatica/client";
import { AcumaticaError } from "@/server/acumatica/errors";
import { getConfig } from "@/server/config";
import { demoCustomer, demoCustomers } from "@/server/demo-data";
import { readSession } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const q = url.searchParams.get("q") ?? "";

  try {
    if (session.mode === "demo") {
      if (id) {
        const customer = demoCustomer(id);
        if (!customer) return NextResponse.json({ error: "That customer was not found." }, { status: 404 });
        return NextResponse.json(customer);
      }
      return NextResponse.json(demoCustomers(q));
    }
    const client = new AcumaticaClient(getConfig(), session.cookieHeader);
    if (id) {
      const customer = await client.getCustomer(id);
      if (!customer) return NextResponse.json({ error: "That customer was not found in Acumatica." }, { status: 404 });
      return NextResponse.json(customer);
    }
    return NextResponse.json(await client.searchCustomers(q));
  } catch (error) {
    return lookupError(error);
  }
}

function lookupError(error: unknown) {
  if (error instanceof AcumaticaError) {
    return NextResponse.json({ error: error.message }, { status: error.status === 401 ? 401 : 502 });
  }
  return NextResponse.json({ error: "The lookup failed. Try again." }, { status: 502 });
}
