import raw from "../../data/operations.json";

export interface OperationDefinition {
  operationId: string;
  workCenter: string;
  description: string;
}

function asText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a string so leading zeros are kept. Check data/operations.json.`);
  }
  return value;
}

export const operations: OperationDefinition[] = raw.map((row, index) => ({
  operationId: asText(row.operationId, `Operation ID on row ${index + 1}`),
  workCenter: asText(row.workCenter, `Work center on row ${index + 1}`),
  description: asText(row.description, `Description on row ${index + 1}`),
}));

export function operationById(operationId: string): OperationDefinition | undefined {
  return operations.find((item) => item.operationId === operationId);
}
