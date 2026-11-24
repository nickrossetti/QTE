import { describe, expect, it } from "vitest";
import { emptyDraft } from "./draft";
import { validateOperations, validateStage } from "./validation";

describe("required-field validation", () => {
  it("asks for the quote fields that the spreadsheet marks required", () => {
    const draft = emptyDraft(new Date("2026-11-24T12:00:00"));
    draft.quote = { dateQuoted: "2026-11-24" };
    const messages = validateStage(draft, "quote").map((error) => error.message);
    expect(messages).toContain("Customer is required.");
    expect(messages).toContain("Inventory ID is required.");
    expect(messages).toContain("Shipping Arrangement is required.");
    expect(messages.some((message) => message.includes("Date Quoted"))).toBe(false);
  });

  it("rejects an end date before the start date and an operation without hours", () => {
    const draft = emptyDraft();
    draft.productionOrder.startDate = "2026-12-10";
    draft.productionOrder.endDate = "2026-12-01";
    expect(validateStage(draft, "productionOrder").some((error) => error.key === "endDate")).toBe(true);

    draft.operations = [
      {
        id: "1",
        operationId: "010",
        workCenter: "10",
        description: "Disassembly",
        estimatedHours: "",
      },
    ];
    expect(validateOperations(draft)[0].message).toMatch(/Disassembly/);
  });
});
