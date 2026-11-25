export class AcumaticaError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AcumaticaError";
  }
}

export class PartialSubmitError extends Error {
  constructor(
    message: string,
    readonly created: {
      quote?: { orderType: string; orderNbr: string };
      salesOrder?: { orderType: string; orderNbr: string; method: "copied" | "converted" };
      productionOrder?: { orderType: string; productionNbr: string };
    },
  ) {
    super(message);
    this.name = "PartialSubmitError";
  }
}

export function acumaticaMessage(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const specific = firstString(record.exceptionMessage, record.message, record.error);
    if (specific) return specific;
    const inner = record.innerException;
    if (inner && typeof inner === "object") {
      const nested = firstString(
        (inner as Record<string, unknown>).exceptionMessage,
        (inner as Record<string, unknown>).message,
      );
      if (nested) return nested;
    }
  }
  if (typeof body === "string" && body.trim() && !body.trim().startsWith("<")) {
    return body.trim().slice(0, 500);
  }
  if (status === 401) return "Your Acumatica session has expired. Sign in again. The quote is still on this device.";
  if (status === 403) return "Your Acumatica user does not have permission to do that.";
  if (status === 429) return "Acumatica is limiting requests right now. Wait a moment and try again.";
  return `Acumatica returned status ${status}.`;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function isMissingAction(error: AcumaticaError): boolean {
  const message = error.message.toLowerCase();
  return (
    error.status === 404 ||
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("no action") ||
    message.includes("unknown action") ||
    message.includes("not implemented")
  );
}
