import { FIELDS } from "./fields";
import { todayIso } from "./format";
import type { Draft, OperationLine, Stage } from "./types";

export const DRAFT_STORAGE_KEY = "qte.draft.v1";

export function emptyDraft(now = new Date()): Draft {
  const draft: Draft = {
    quote: {},
    salesOrder: {},
    productionOrder: {},
    operations: [],
    overrides: [],
  };
  for (const field of FIELDS) {
    if (field.defaultValue !== undefined) {
      draft[field.stage][field.key] = field.defaultValue;
    }
  }
  const today = todayIso(now);
  draft.quote.dateQuoted = today;
  draft.quote.dateQuoteRequested = today;
  draft.salesOrder.dateSoCreated = today;
  return carryForward(draft);
}

export function overrideToken(stage: Stage, key: string): string {
  return `${stage}.${key}`;
}

export function carryForward(draft: Draft): Draft {
  const next: Draft = {
    quote: { ...draft.quote },
    salesOrder: { ...draft.salesOrder },
    productionOrder: { ...draft.productionOrder },
    operations: draft.operations.map((line) => ({ ...line })),
    overrides: [...draft.overrides],
  };

  for (const field of FIELDS) {
    if (!field.copiedFrom) continue;
    if (!next.overrides.includes(overrideToken(field.stage, field.key))) {
      next[field.stage][field.key] = next[field.copiedFrom.stage][field.copiedFrom.key] ?? "";
    }
    for (const companion of field.copiesWith ?? []) {
      if (next.overrides.includes(overrideToken(field.stage, companion))) continue;
      next[field.stage][companion] = next[field.copiedFrom.stage][companion] ?? "";
    }
  }
  return next;
}

export function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Draft;
  return (
    !!draft.quote &&
    typeof draft.quote === "object" &&
    !!draft.salesOrder &&
    typeof draft.salesOrder === "object" &&
    !!draft.productionOrder &&
    typeof draft.productionOrder === "object" &&
    Array.isArray(draft.operations) &&
    Array.isArray(draft.overrides)
  );
}

export function withField(
  draft: Draft,
  stage: Stage,
  key: string,
  value: string,
  extras?: Record<string, string>,
): Draft {
  const next: Draft = {
    ...draft,
    quote: { ...draft.quote },
    salesOrder: { ...draft.salesOrder },
    productionOrder: { ...draft.productionOrder },
    operations: draft.operations,
    overrides: [...draft.overrides],
  };
  next[stage] = { ...draft[stage], [key]: value, ...extras };
  const field = FIELDS.find((item) => item.stage === stage && item.key === key);
  if (field?.copiedFrom) {
    markOverride(next, stage, key);
    for (const extraKey of Object.keys(extras ?? {})) markOverride(next, stage, extraKey);
    for (const companion of field.copiesWith ?? []) {
      if (extras && extraKeyDefined(extras, companion)) markOverride(next, stage, companion);
    }
  }
  return carryForward(next);
}

function extraKeyDefined(extras: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(extras, key);
}

function markOverride(draft: Draft, stage: Stage, key: string) {
  const token = overrideToken(stage, key);
  if (!draft.overrides.includes(token)) draft.overrides.push(token);
}

export function restoreCopied(draft: Draft, stage: Stage, key: string): Draft {
  const field = FIELDS.find((item) => item.stage === stage && item.key === key);
  const keys = [key, ...(field?.copiesWith ?? [])];
  const drop = new Set(keys.map((item) => overrideToken(stage, item)));
  return carryForward({
    ...draft,
    overrides: draft.overrides.filter((token) => !drop.has(token)),
  });
}

export function withOperations(draft: Draft, operations: OperationLine[]): Draft {
  return { ...draft, operations };
}
