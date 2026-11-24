"use client";

import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui";

export function AppHeader({
  username,
  tenant,
  mode,
  onSignOut,
}: {
  username: string;
  tenant: string;
  mode: "demo" | "live";
  onSignOut: () => void;
}) {
  return (
    <header className="relative border-b-[3px] border-royal bg-white">
      <div className="qte-pattern pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="rounded-md bg-white px-1">
          <BrandLogo className="h-12" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white/95 px-2 py-1 text-sm">
          {mode === "demo" && (
            <span className="rounded-full bg-royal/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-royal">
              Demo mode
            </span>
          )}
          <span className="font-semibold text-navy">{username}</span>
          <span className="text-slate-600">{tenant}</span>
          <Button type="button" variant="secondary" className="min-h-10 px-3" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
