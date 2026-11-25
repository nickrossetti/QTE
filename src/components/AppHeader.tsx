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
    <header className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 min-[900px]:absolute min-[900px]:inset-x-0 min-[900px]:top-0 min-[900px]:justify-end min-[900px]:bg-transparent min-[900px]:px-8 min-[900px]:pt-32">
      <BrandLogo className="h-10 min-[900px]:hidden" />
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 rounded-xl bg-white/95 px-2 py-1 text-sm shadow-sm ring-1 ring-white/80">
        {mode === "demo" && (
          <span className="rounded-full bg-royal/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-royal">
            Demo mode
          </span>
        )}
        <span className="font-semibold text-navy">{username}</span>
        <span className="hidden text-slate-600 sm:inline">{tenant}</span>
        <Button type="button" variant="secondary" className="min-h-10 px-3" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
