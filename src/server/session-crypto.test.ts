import { describe, expect, it } from "vitest";
import { cookieHeaderFromSetCookie } from "./acumatica/cookies";
import { openSession, sealSession, type Session } from "./session-crypto";

describe("session cookie", () => {
  it("round-trips a live session and never contains the password", () => {
    const password = "correct-horse-battery";
    const session: Session = {
      mode: "live",
      username: "ada",
      tenant: "Quality Track Equipment",
      cookieHeader: "ASP.NET_SessionId=abc; .ASPXAUTH=def",
      createdAt: 1,
    };
    const token = sealSession(session, "test-secret");
    expect(token).not.toContain(password);
    expect(token).not.toContain("correct-horse");
    expect(JSON.stringify(session)).not.toContain(password);
    expect(session).not.toHaveProperty("password");
    expect(openSession(token, "test-secret")).toEqual(session);
    expect(openSession(token, "other-secret")).toBeNull();
  });

  it("keeps only the cookie pair from Set-Cookie headers", () => {
    const header = cookieHeaderFromSetCookie([
      "ASP.NET_SessionId=abc123; path=/; HttpOnly",
      ".ASPXAUTH=token; path=/; secure; HttpOnly",
      "Locale=en-US; path=/",
    ]);
    expect(header).toBe("ASP.NET_SessionId=abc123; .ASPXAUTH=token; Locale=en-US");
  });
});
