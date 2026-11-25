export type Stage = "quote" | "salesOrder" | "productionOrder";

export interface OperationLine {
  id: string;
  operationId: string;
  workCenter: string;
  description: string;
  /** Total estimated hours for this work center, as typed. */
  estimatedHours: string;
}

export interface Draft {
  quote: Record<string, string>;
  salesOrder: Record<string, string>;
  productionOrder: Record<string, string>;
  operations: OperationLine[];
  /** Keys like "salesOrder.customerId" that the estimator edited after copy. */
  overrides: string[];
}

export interface FieldError {
  stage: Stage | "operations";
  key: string;
  message: string;
}

export interface CreatedDocument {
  orderType: string;
  orderNbr: string;
}

export interface SubmitResult {
  mode: "demo" | "live";
  quote: CreatedDocument;
  salesOrder: CreatedDocument & { method: "copied" | "converted" };
  productionOrder: { orderType: string; productionNbr: string };
  operationCount: number;
  warning?: string;
}
