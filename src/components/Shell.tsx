"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface SessionInfo {
  mode: "demo" | "live";
  username: string;
  tenant: string;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SessionInfo;
      })
      .then((info) => {
        if (!cancel) setSession(info);
      })
      .catch(() => {
        if (!cancel) setSession(null);
      });
    return () => {
      cancel = true;
    };
  }, [path]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    router.push("/");
    router.refresh();
  }

  const quotesOn = path === "/" || path.startsWith("/quote");
  const howOn = path.startsWith("/how-to");
  const signOn = path.startsWith("/sign-in");

  return (
    <div className="min-h-screen bg-mist text-[#14213D]">
      <header className="noprint flex flex-wrap items-center gap-4 border-b-[5px] border-royal bg-navy px-4 py-2.5 text-white sm:px-6">
        <Link href="/" className="rounded-lg bg-white px-2 py-1">
          {/* Official wordmark. The full-page artwork is not used in the estimating app's header. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/qte-logo.png" alt="QTE Quality Track Equipment" className="h-12 w-auto" />
        </Link>
        <div className="min-w-[8rem] flex-1 font-display text-[1.7rem] font-extrabold uppercase leading-none tracking-wide">
          Quoting
          <small className="mt-1 block font-sans text-xs font-semibold uppercase tracking-[0.14em] opacity-80">
            Quality Track Equipment
          </small>
        </div>
        <nav className="flex flex-wrap gap-2">
          <NavLink href="/" current={quotesOn}>
            Quotes
          </NavLink>
          <NavLink href="/how-to" current={howOn}>
            How to use
          </NavLink>
          {session?.mode === "live" ? (
            <button type="button" className="nav-link" onClick={() => void signOut()}>
              Sign out
            </button>
          ) : (
            <NavLink href="/sign-in" current={signOn}>
              {session?.mode === "demo" && session.username ? session.username : "Sign in"}
            </NavLink>
          )}
        </nav>
      </header>
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 sm:px-6">{children}</div>
    </div>
  );
}

function NavLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`nav-link ${current ? "nav-link-on" : ""}`} aria-current={current ? "page" : undefined}>
      {children}
    </Link>
  );
}
