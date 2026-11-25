import type { FieldDefinition } from "./fields";
import { formatDate } from "./format";

export function displayField(field: FieldDefinition, values: Record<string, string>): string {
  const value = (values[field.key] ?? "").trim();
  if (!value) return "—";
  if (field.key === "customerId") {
    return values.customerName ? `${values.customerName} (${value})` : value;
  }
  if (field.key === "inventoryId") {
    return values.inventoryDescription ? `${value} — ${values.inventoryDescription}` : value;
  }
  if (field.key === "paymentTerms") {
    return values.paymentTermsDescription ? `${values.paymentTermsDescription} (${value})` : value;
  }
  if (field.type === "select") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  if (field.type === "date") return formatDate(value);
  return value;
}
