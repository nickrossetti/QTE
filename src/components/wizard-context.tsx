"use client";

import { createContext, useContext } from "react";
import type { Draft, OperationLine, Stage } from "@/domain/types";

export interface WizardApi {
  draft: Draft;
  errors: Record<string, string>;
  updateField: (stage: Stage, key: string, value: string, extras?: Record<string, string>) => void;
  restore: (stage: Stage, key: string) => void;
  setOperations: (operations: OperationLine[]) => void;
}

const WizardContext = createContext<WizardApi | null>(null);

export function WizardProvider({ value, children }: { value: WizardApi; children: React.ReactNode }) {
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardApi {
  const value = useContext(WizardContext);
  if (!value) throw new Error("Wizard fields rendered outside the quote wizard.");
  return value;
}
