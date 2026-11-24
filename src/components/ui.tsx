import type { ButtonHTMLAttributes, ReactNode } from "react";

export function buttonClass(variant: "primary" | "secondary" | "quiet" = "primary"): string {
  const base =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal disabled:cursor-not-allowed disabled:opacity-60";
  if (variant === "primary") return `${base} bg-royal text-white shadow-sm hover:bg-royal-dark`;
  if (variant === "secondary") return `${base} border border-navy/15 bg-white text-navy hover:bg-mist`;
  return `${base} min-h-10 bg-transparent px-2 text-royal hover:bg-royal/5`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "quiet" }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function inputClass(invalid = false): string {
  return [
    "w-full rounded-lg border bg-white px-3 text-base text-navy shadow-sm outline-none placeholder:text-slate-400",
    "focus:border-royal focus:ring-2 focus:ring-royal/20",
    invalid ? "border-red-600" : "border-line",
  ].join(" ");
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-royal/5 px-3 py-2 text-sm leading-relaxed text-navy">{children}</p>
  );
}
