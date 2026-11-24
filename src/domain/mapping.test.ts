import { describe, expect, it } from "vitest";
import { operations } from "./catalog";
import { DEFAULTS } from "./constants";
import { carryForward, emptyDraft } from "./draft";
import { FIELDS } from "./fields";
import {
  buildAcumaticaDocuments,
  buildProductionDetailPayload,
  type MappingConfig,
} from "./mapping";
import type { Draft } from "./types";
import { validateAll } from "./validation";

const config: MappingConfig = {
  quoteOrderType: "MS",
  salesOrderType: "MS",
  createOnHold: true,
  sendCustomFields: false,
  productionSource: "Sales Order",
};

function sampleDraft(): Draft {
  const draft = emptyDraft(new Date("2026-11-24T15:00:00"));
  draft.quote = {
    ...draft.quote,
    dateQuoted: "2026-11-01",
    dateQuoteRequested: "2026-10-28",
    requiredDeliveryDate: "2027-02-15",
    customerReferenceNumber: "LOI-440",
    customerId: "NORTH",
    customerName: "Northline Mining Co.",
    contactId: "1001",
    contactName: "Ada Lovelace",
    contactPhone: "(555) 010-1000",
    contactEmail: "ada@northline.example",
    description: "48 inch track machine rebuild",
    inventoryId: "QTE-TRK-48",
    inventoryDescription: "Track Machine 48 in",
    paymentTerms: "NET30",
    paymentTermsDescription: "Net 30",
    shippingArrangement: "Third Party arranged by QTE",
  };
  draft.salesOrder.poNumber = "PO-7781";
  draft.salesOrder.dateQuoteAccepted = "2026-11-20";
  draft.salesOrder.dateSoCreated = "2026-11-24";
  draft.salesOrder.shipAddressLine1 = "100 Quarry Road";
  draft.salesOrder.shipAddressLine2 = "Dock 4";
  draft.salesOrder.shipCity = "Duluth";
  draft.salesOrder.shipState = "MN";
  draft.salesOrder.shipPostalCode = "55802";
  draft.productionOrder.orderType = "RM";
  draft.productionOrder.qtyToProduce = "1";
  draft.productionOrder.machineSerialNumber = "SN-2044";
  draft.productionOrder.startDate = "2026-12-01";
  draft.productionOrder.endDate = "2027-01-20";
  draft.operations = [
    {
      id: "line-1",
      operationId: "010",
      workCenter: "10",
      description: "Disassembly",
      estimatedHours: "12",
    },
    {
      id: "line-2",
      operationId: "000",
      workCenter: "00",
      description: "Mobilization",
      estimatedHours: "8",
    },
    {
      id: "line-3",
      operationId: "110",
      workCenter: "OP10",
      description: "Engineering",
      estimatedHours: "4",
    },
  ];
  return carryForward(draft);
}

describe("operations catalog", () => {
  it("keeps leading zeros and the work centers from the spreadsheet", () => {
    expect(operations).toHaveLength(43);
    expect(operations[0]).toEqual({
      operationId: "000",
      workCenter: "00",
      description: "Mobilization",
    });
    expect(operations.find((item) => item.description === "Disassembly")?.operationId).toBe("010");
    expect(operations.find((item) => item.description === "Engineering")).toMatchObject({
      operationId: "110",
      workCenter: "OP10",
    });
    expect(operations.find((item) => item.description === "Quality")?.workCenter).toBe("OP20");
    expect(operations.every((item) => typeof item.operationId === "string")).toBe(true);
  });
});

describe("field catalog", () => {
  it("includes every required field from the quoting spreadsheet", () => {
    const expected: [string, string][] = [
      ["quote", "Date Quoted"],
      ["quote", "Date Quote Requested"],
      ["quote", "Required Delivery Date"],
      ["quote", "Customer Reference Number"],
      ["quote", "Customer"],
      ["quote", "Customer Contact Name"],
      ["quote", "Customer Contact Phone"],
      ["quote", "Customer Contact Email"],
      ["quote", "Description"],
      ["quote", "Inventory ID"],
      ["quote", "Payment Terms"],
      ["quote", "Shipping Arrangement"],
      ["salesOrder", "Date SO Created"],
      ["salesOrder", "Date Quote Accepted"],
      ["salesOrder", "Required Delivery Date"],
      ["salesOrder", "Customer Reference Number"],
      ["salesOrder", "Customer"],
      ["salesOrder", "Customer Contact Name"],
      ["salesOrder", "Customer Contact Phone"],
      ["salesOrder", "Customer Contact Email"],
      ["salesOrder", "Description"],
      ["salesOrder", "Inventory ID"],
      ["salesOrder", "Payment Terms"],
      ["salesOrder", "Shipping Arrangement"],
      ["salesOrder", "Shipping Address"],
      ["salesOrder", "PO Number"],
      ["productionOrder", "Order Type"],
      ["productionOrder", "Inventory ID"],
      ["productionOrder", "Qty to Produce"],
      ["productionOrder", "UoM"],
      ["productionOrder", "Machine Serial Number"],
      ["productionOrder", "Warehouse"],
      ["productionOrder", "Location"],
      ["productionOrder", "Costing Method"],
      ["productionOrder", "Scheduling Method"],
      ["productionOrder", "Start Date"],
      ["productionOrder", "End Date"],
      ["productionOrder", "Due Date"],
      ["productionOrder", "Customer"],
      ["productionOrder", "WIP Account"],
      ["productionOrder", "WIP Variance Account"],
    ];
    for (const [stage, label] of expected) {
      expect(FIELDS.some((field) => field.stage === stage && field.label === label)).toBe(true);
    }
  });
});

describe("copy forward and defaults", () => {
  it("fills QTE defaults and carries quote values onto the later stages", () => {
    const draft = sampleDraft();
    expect(draft.productionOrder.uom).toBe(DEFAULTS.uom);
    expect(draft.productionOrder.warehouse).toBe("1");
    expect(draft.productionOrder.location).toBe("MAIN");
    expect(draft.productionOrder.costingMethod).toBe("Estimated");
    expect(draft.productionOrder.schedulingMethod).toBe("User Dates");
    expect(draft.productionOrder.wipAccount).toBe("1215 - Work-In-Process MFG");
    expect(draft.productionOrder.wipVarianceAccount).toBe("5910 - WIP MFG Variance");
    expect(draft.salesOrder.customerId).toBe("NORTH");
    expect(draft.salesOrder.customerName).toBe("Northline Mining Co.");
    expect(draft.salesOrder.requiredDeliveryDate).toBe("2027-02-15");
    expect(draft.salesOrder.shippingArrangement).toBe("Third Party arranged by QTE");
    expect(draft.productionOrder.inventoryId).toBe("QTE-TRK-48");
    expect(draft.productionOrder.customerId).toBe("NORTH");
    expect(draft.productionOrder.dueDate).toBe("2027-02-15");
    expect(validateAll(draft)).toEqual([]);
  });
});

describe("Acumatica field mapping", () => {
  it("maps the quote, sales order, production order, and operations", () => {
    const draft = sampleDraft();
    const docs = buildAcumaticaDocuments(draft, config, {
      quoteNbr: "MS100001",
      salesOrderNbr: "MS100002",
      productionNbr: "PR100001",
    });

    expect(docs.quote.OrderType).toEqual({ value: "MS" });
    expect(docs.quote.CustomerID).toEqual({ value: "NORTH" });
    expect(docs.quote.CustomerOrder).toEqual({ value: "LOI-440" });
    expect(docs.quote.Date).toEqual({ value: "2026-11-01T00:00:00" });
    expect(docs.quote.RequestedOn).toEqual({ value: "2027-02-15T00:00:00" });
    expect(docs.quote.Description).toEqual({ value: "48 inch track machine rebuild" });
    expect(docs.quote.ContactID).toEqual({ value: 1001 });
    expect(docs.quote.FinancialSettings).toEqual({ Terms: { value: "NET30" } });
    expect(docs.quote).not.toHaveProperty("custom");
    const quoteDetail = (docs.quote.Details as Record<string, unknown>[])[0];
    expect(quoteDetail).toMatchObject({
      InventoryID: { value: "QTE-TRK-48" },
      OrderQty: { value: 1 },
      UOM: { value: "EA" },
      WarehouseID: { value: "1" },
    });
    expect(String((docs.quote.note as { value: string }).value)).toContain(
      "Third Party arranged by QTE",
    );

    expect(docs.salesOrder.OrderType).toEqual({ value: "MS" });
    expect(docs.salesOrder.CustomerOrder).toEqual({ value: "PO-7781" });
    expect(docs.salesOrder.Date).toEqual({ value: "2026-11-24T00:00:00" });
    expect(docs.salesOrder.RequestedOn).toEqual({ value: "2027-02-15T00:00:00" });
    expect(docs.salesOrder.ShipToAddress).toMatchObject({
      AddressLine1: { value: "100 Quarry Road" },
      AddressLine2: { value: "Dock 4" },
      City: { value: "Duluth" },
      State: { value: "MN" },
      PostalCode: { value: "55802" },
      Country: { value: "US" },
    });
    expect(String((docs.salesOrder.note as { value: string }).value)).toContain("LOI-440");
    expect(String((docs.salesOrder.note as { value: string }).value)).toContain("MS100001");

    expect(docs.productionOrder).toMatchObject({
      OrderType: { value: "RM" },
      InventoryID: { value: "QTE-TRK-48" },
      QtytoProduce: { value: 1 },
      UOM: { value: "EA" },
      Warehouse: { value: "1" },
      Location: { value: "MAIN" },
      Customer: { value: "NORTH" },
      CostingMethod: { value: "Estimated" },
      SchedulingMethod: { value: "User Dates" },
      StartDate: { value: "2026-12-01T00:00:00" },
      EndDate: { value: "2027-01-20T00:00:00" },
      Constraint: { value: "2027-02-15T00:00:00" },
      WIPAccount: { value: "1215" },
      WIPVarianceAccount: { value: "5910" },
      SOOrderType: { value: "MS" },
      SOOrderNbr: { value: "MS100002" },
      SOLineNbr: { value: 1 },
      Source: { value: "Sales Order" },
      Hold: { value: true },
    });
    expect(String((docs.productionOrder.OrderDescription as { value: string }).value)).toContain(
      "SN-2044",
    );

    const detail = docs.productionOrderDetail;
    const ops = detail.Operations as Record<string, { value: string | number }>[];
    expect(ops.map((line) => line.OperationNbr.value)).toEqual(["010", "000", "110"]);
    expect(ops.every((line) => typeof line.OperationNbr.value === "string")).toBe(true);
    expect(ops[0]).toMatchObject({
      WorkCenter: { value: "10" },
      OperationDescription: { value: "Disassembly" },
      RunUnits: { value: 1.5 },
      RunTime: { value: 480 },
    });
    expect(ops[1].RunUnits).toEqual({ value: 1 });
    expect(ops[2]).toMatchObject({
      WorkCenter: { value: "OP10" },
      RunUnits: { value: 0.5 },
      RunTime: { value: 480 },
    });
    expect(detail.ProductionNbr).toEqual({ value: "PR100001" });
  });

  it("sends configured custom fields only when asked", () => {
    const draft = sampleDraft();
    const withCustom = buildAcumaticaDocuments(draft, { ...config, sendCustomFields: true });
    const custom = withCustom.salesOrder.custom as Record<string, Record<string, { value: string }>>;
    expect(custom.Document.UsrShippingArrangement.value).toBe("Third Party arranged by QTE");
    expect(custom.Document.UsrCustomerReference.value).toBe("LOI-440");
    expect(custom.Document.UsrDateQuoteAccepted.value).toBe("2026-11-20T00:00:00");
    const productionCustom = withCustom.productionOrder.custom as Record<
      string,
      Record<string, { value: string }>
    >;
    expect(productionCustom.ProdItem.UsrMachineSerialNumber.value).toBe("SN-2044");
  });

  it("does not renumber operation IDs when building the detail payload", () => {
    const draft = sampleDraft();
    const detail = buildProductionDetailPayload(draft);
    const first = (detail.Operations as { OperationNbr: { value: string } }[])[0];
    expect(first.OperationNbr.value).toBe("010");
    expect(first.OperationNbr.value).not.toBe(10);
  });
});
