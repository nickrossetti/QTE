import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

export type Session =
  | {
      mode: "demo";
      username: string;
      tenant: string;
      createdAt: number;
    }
  | {
      mode: "live";
      username: string;
      tenant: string;
      cookieHeader: string;
      createdAt: number;
    };

const keyCache = new Map<string, Buffer>();

function keyFor(secret: string): Buffer {
  let key = keyCache.get(secret);
  if (!key) {
    key = scryptSync(secret, "qte-session-salt-v1", 32);
    keyCache.set(secret, key);
  }
  return key;
}

export function sealSession(session: Session, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openSession(token: string, secret: string): Session | null {
  try {
    const buffer = Buffer.from(token, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const session = JSON.parse(json) as Session;
    if (!session || (session.mode !== "demo" && session.mode !== "live")) return null;
    if (!session.username || !session.tenant) return null;
    if (session.mode === "live" && !session.cookieHeader) return null;
    return session;
  } catch {
    return null;
  }
}

export function chunkToken(token: string, size = 3200): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < token.length; index += size) {
    chunks.push(token.slice(index, index + size));
  }
  return chunks.length ? chunks : [""];
}

export function joinToken(chunks: string[]): string {
  return chunks.join("");
}

/** Live sessions are 12 hours. Acumatica may expire sooner; a 401 sends the user back to sign in. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export const DEMO_SESSION_SECRET = "qte-demo-session-v1-not-for-live-acumatica";
