import { cookies } from "next/headers";
import { getConfig } from "./config";
import {
  DEMO_SESSION_SECRET,
  SESSION_MAX_AGE_SECONDS,
  chunkToken,
  joinToken,
  openSession,
  sealSession,
  type Session,
} from "./session-crypto";

const COOKIE = "qte_s";
const CHUNK_COUNT = 8;

function secretFor(session: Session): string {
  if (session.mode === "demo") return DEMO_SESSION_SECRET;
  const secret = getConfig().sessionSecret;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. An administrator needs to add it before live sign-in works.");
  }
  return secret;
}

/** Lookups and demo submit work with no cookie. A missing session is demo mode. */
export async function readSessionOrDemo(): Promise<Session> {
  const session = await readSession();
  if (session) return session;
  const tenant = getConfig().tenants[0] || "Quality Track Equipment";
  return { mode: "demo", username: "", tenant, createdAt: 0 };
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const parts: string[] = [];
  for (let index = 0; index < CHUNK_COUNT; index += 1) {
    const part = jar.get(`${COOKIE}_${index}`)?.value;
    if (!part) break;
    parts.push(part);
  }
  if (!parts.length) return null;
  const token = joinToken(parts);
  const config = getConfig();
  return (
    openSession(token, DEMO_SESSION_SECRET) ??
    (config.sessionSecret ? openSession(token, config.sessionSecret) : null)
  );
}

export function applySessionCookie(response: { cookies: { set: (name: string, value: string, options: CookieOptions) => void } }, session: Session) {
  const token = sealSession(session, secretFor(session));
  const chunks = chunkToken(token);
  const options = cookieOptions();
  for (let index = 0; index < CHUNK_COUNT; index += 1) {
    const value = chunks[index] ?? "";
    response.cookies.set(`${COOKIE}_${index}`, value, value ? options : { ...options, maxAge: 0 });
  }
}

export function clearSessionCookie(response: { cookies: { set: (name: string, value: string, options: CookieOptions) => void } }) {
  const options = cookieOptions();
  for (let index = 0; index < CHUNK_COUNT; index += 1) {
    response.cookies.set(`${COOKIE}_${index}`, "", { ...options, maxAge: 0 });
  }
}

interface CookieOptions {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
