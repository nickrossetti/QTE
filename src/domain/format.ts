export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "—";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "1215 - Work-In-Process MFG" → "1215". Values without a label pass through. */
export function accountCode(value: string): string {
  const trimmed = value.trim();
  const [code] = trimmed.split(" - ");
  return (code ?? trimmed).trim();
}

export function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + "…";
}

/** Calendar date with no timezone suffix, so Acumatica does not shift it back a day. */
export function acumaticaDate(isoDate: string): string {
  return `${isoDate}T00:00:00`;
}

export function formatRunUnits(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, "");
}

export function productionTypeLabel(code: string): string {
  const labels: Record<string, string> = {
    MN: "MN-Manufacture",
    RM: "RM-Remanufacture",
    RC: "RC-Recondition",
    RP: "RP-Repair",
  };
  return labels[code] ?? code;
}
