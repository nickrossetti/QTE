import type { Stage } from "./types";

export const STEPS: { id: string; label: string; stage: Stage | "operations" | "review" }[] = [
  { id: "quote", label: "Quote", stage: "quote" },
  { id: "salesOrder", label: "Sales Order", stage: "salesOrder" },
  { id: "productionOrder", label: "Production", stage: "productionOrder" },
  { id: "operations", label: "Operations", stage: "operations" },
  { id: "review", label: "Review", stage: "review" },
];
