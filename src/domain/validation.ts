import { operations as catalog } from "./catalog";
import { fieldsFor } from "./fields";
import type { Draft, FieldError, Stage } from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateStage(draft: Draft, stage: Stage): FieldError[] {
  const errors: FieldError[] = [];
  for (const field of fieldsFor(stage)) {
    const value = (draft[stage][field.key] ?? "").trim();
    if (field.required && !value) {
      errors.push({
        stage,
        key: field.key,
        message: requiredMessage(field.label),
      });
      continue;
    }
    if (!value) continue;
    if (field.type === "email" && !EMAIL.test(value)) {
      errors.push({
        stage,
        key: field.key,
        message: `Enter a valid email address for ${field.label}.`,
      });
    } else if (field.type === "tel" && value.replace(/\D/g, "").length < 7) {
      errors.push({
        stage,
        key: field.key,
        message: `Enter a phone number for ${field.label}, including the area code.`,
      });
    } else if (field.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push({ stage, key: field.key, message: `Choose a date for ${field.label}.` });
    } else if (field.type === "number") {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push({
          stage,
          key: field.key,
          message: `${field.label} must be greater than zero.`,
        });
      }
    } else if (field.maxLength && value.length > field.maxLength) {
      errors.push({
        stage,
        key: field.key,
        message: `${field.label} must be ${field.maxLength} characters or fewer so it fits in Acumatica.`,
      });
    }
  }

  if (stage === "productionOrder") {
    const start = draft.productionOrder.startDate;
    const end = draft.productionOrder.endDate;
    if (start && end && end < start) {
      errors.push({
        stage,
        key: "endDate",
        message: "End Date must be on or after Start Date.",
      });
    }
  }

  return errors;
}

export function validateOperations(draft: Draft): FieldError[] {
  if (draft.operations.length === 0) {
    return [
      {
        stage: "operations",
        key: "operations",
        message: "Add at least one operation. Pick a description, then enter the estimated hours.",
      },
    ];
  }
  const errors: FieldError[] = [];
  const seen = new Set<string>();
  for (const line of draft.operations) {
    if (!catalog.some((item) => item.operationId === line.operationId)) {
      errors.push({
        stage: "operations",
        key: line.id,
        message: `${line.description || "This operation"} is not in the operations list.`,
      });
    }
    if (seen.has(line.operationId)) {
      errors.push({
        stage: "operations",
        key: line.id,
        message: `${line.description} is already on this order. Each operation can only be added once.`,
      });
    }
    seen.add(line.operationId);
    const hours = Number(line.estimatedHours);
    if (!line.estimatedHours.trim() || !Number.isFinite(hours) || hours <= 0) {
      errors.push({
        stage: "operations",
        key: line.id,
        message: `Enter the total estimated hours for ${line.description}. Use a number greater than zero.`,
      });
    }
  }
  return errors;
}

export function validateAll(draft: Draft): FieldError[] {
  return [
    ...validateStage(draft, "quote"),
    ...validateStage(draft, "salesOrder"),
    ...validateStage(draft, "productionOrder"),
    ...validateOperations(draft),
  ];
}

function requiredMessage(label: string): string {
  return `${label} is required.`;
}

export function errorMap(errors: FieldError[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const error of errors) {
    const token = error.stage === "operations" ? `operations.${error.key}` : `${error.stage}.${error.key}`;
    if (!map[token]) map[token] = error.message;
  }
  return map;
}
