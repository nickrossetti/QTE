"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { Button, inputClass } from "./ui";

export function SignInForm({
  tenants,
  demoOnly,
  expired,
}: {
  tenants: string[];
  demoOnly: boolean;
  expired: boolean;
}) {
  const router = useRouter();
  const [tenant, setTenant] = useState(tenants[0] ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"live" | "demo" | null>(null);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy("live");
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, tenant }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Acumatica could not sign you in.");
        return;
      }
      router.push("/quote");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Try again, or continue in demo mode.");
    } finally {
      setBusy(null);
    }
  }

  async function demo() {
    setBusy("demo");
    setError("");
    try {
      const response = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, username: username.trim() || "Demo estimator" }),
      });
      if (!response.ok) {
        setError("Demo mode could not be started.");
        return;
      }
      router.push("/quote");
      router.refresh();
    } catch {
      setError("We couldn't start demo mode. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="qte-app-bg">
      <div className="mx-auto flex min-h-screen w-full items-center px-4 py-8 min-[900px]:pl-[46vw] min-[900px]:pr-10 min-[1200px]:pr-16">
        <div className="w-full max-w-lg rounded-2xl bg-white/95 p-6 shadow-card ring-1 ring-white/70 sm:p-8" data-testid="sign-in">
          <BrandLogo className="mb-4 h-16 min-[900px]:hidden" />
          <h1 className="font-display text-4xl font-semibold leading-none text-navy md:mt-0">Sales quoting</h1>
          <p className="mt-2 text-base text-slate-600">
            Build a machine-sales quote, turn it into a sales order, and send the production order to Acumatica.
          </p>
          {expired && (
            <p className="mt-4 rounded-lg bg-royal/5 px-3 py-2 text-sm font-semibold text-navy" role="status">
              Your session expired. Sign in again. A quote you already started on this device is still here.
            </p>
          )}
          {!demoOnly && (
            <form className="mt-6 flex flex-col gap-4" onSubmit={signIn}>
              <label className="text-base font-semibold text-navy">
                Tenant
                <select
                  className={`${inputClass(false)} mt-1.5 h-12`}
                  value={tenant}
                  onChange={(event) => setTenant(event.target.value)}
                >
                  {tenants.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-base font-semibold text-navy">
                Acumatica username
                <input
                  className={`${inputClass(false)} mt-1.5 h-12`}
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>
              <label className="text-base font-semibold text-navy">
                Password
                <input
                  className={`${inputClass(false)} mt-1.5 h-12`}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <p className="text-sm text-slate-600">
                Your password is sent only to sign in. It is not saved in this app.
              </p>
              {error && (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy !== null}>
                {busy === "live" ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
          <div className={demoOnly ? "mt-6" : "mt-4 border-t border-line pt-4"}>
            {demoOnly && error && (
              <p className="mb-3 text-sm font-semibold text-red-700" role="alert">
                {error}
              </p>
            )}
            <Button
              type="button"
              variant={demoOnly ? "primary" : "secondary"}
              className="w-full"
              disabled={busy !== null}
              data-testid="demo-mode-button"
              onClick={() => void demo()}
            >
              {busy === "demo" ? "Starting demo…" : "Continue in demo mode"}
            </Button>
            <p className="mt-2 text-sm text-slate-600">
              Demo mode uses sample customers, inventory, and terms. Nothing is sent to Acumatica.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
