import customFieldConfig from "../../config/custom-fields.json";
import { estimatedHoursToRun } from "./run-time";
import { accountCode, acumaticaDate, productionTypeLabel, truncate } from "./format";
import type { Draft } from "./types";

export interface MappingConfig {
  quoteOrderType: string;
  salesOrderType: string;
  createOnHold: boolean;
  sendCustomFields: boolean;
  productionSource: string;
}

export interface DocumentLinks {
  quoteNbr?: string;
  salesOrderNbr?: string;
  productionNbr?: string;
}

export interface AcumaticaValue {
  value: string | number | boolean;
}

type Payload = Record<string, unknown>;

export interface AcumaticaDocuments {
  quote: Payload;
  salesOrder: Payload;
  productionOrder: Payload;
  productionOrderDetail: Payload;
}

interface CustomBinding {
  view: string;
  field: string;
  type: string;
}

const customFields = customFieldConfig as Record<string, Record<string, CustomBinding>>;

export function buildAcumaticaDocuments(
  draft: Draft,
  config: MappingConfig,
  links: DocumentLinks = {},
): AcumaticaDocuments {
  return {
    quote: buildQuotePayload(draft, config),
    salesOrder: buildSalesOrderPayload(draft, config, links),
    productionOrder: buildProductionOrderPayload(draft, config, links),
    productionOrderDetail: buildProductionDetailPayload(draft, links),
  };
}

export function buildQuotePayload(draft: Draft, config: MappingConfig): Payload {
  const quote = draft.quote;
  const qty = Number(draft.productionOrder.qtyToProduce);
  const payload: Payload = {
    OrderType: { value: config.quoteOrderType },
    CustomerID: { value: quote.customerId },
    CustomerOrder: { value: quote.customerReferenceNumber },
    Date: { value: acumaticaDate(quote.dateQuoted) },
    RequestedOn: { value: acumaticaDate(quote.requiredDeliveryDate) },
    Description: { value: truncate(quote.description, 256) },
    Hold: { value: config.createOnHold },
    note: { value: quoteNote(draft, config.quoteOrderType) },
    ...contactId(quote.contactId),
    Details: [lineDetail(quote.inventoryId, quote.description, qty, draft)],
    FinancialSettings: {
      Terms: { value: quote.paymentTerms },
    },
    ShipToContact: contact(quote),
  };
  const custom = config.sendCustomFields ? customBlock("quote", quote) : undefined;
  if (custom) payload.custom = custom;
  return payload;
}

export function buildSalesOrderPayload(
  draft: Draft,
  config: MappingConfig,
  links: DocumentLinks = {},
): Payload {
  const salesOrder = draft.salesOrder;
  const qty = Number(draft.productionOrder.qtyToProduce);
  const payload: Payload = {
    OrderType: { value: config.salesOrderType },
    CustomerID: { value: salesOrder.customerId },
    CustomerOrder: { value: salesOrder.poNumber },
    Date: { value: acumaticaDate(salesOrder.dateSoCreated) },
    RequestedOn: { value: acumaticaDate(salesOrder.requiredDeliveryDate) },
    Description: { value: truncate(salesOrder.description, 256) },
    Hold: { value: config.createOnHold },
    note: { value: salesOrderNote(draft, config.salesOrderType, links.quoteNbr) },
    ...contactId(salesOrder.contactId),
    Details: [lineDetail(salesOrder.inventoryId, salesOrder.description, qty, draft)],
    FinancialSettings: {
      Terms: { value: salesOrder.paymentTerms },
    },
    ShipToAddress: {
      AddressLine1: { value: salesOrder.shipAddressLine1 },
      ...(salesOrder.shipAddressLine2?.trim()
        ? { AddressLine2: { value: salesOrder.shipAddressLine2.trim() } }
        : {}),
      City: { value: salesOrder.shipCity },
      State: { value: salesOrder.shipState },
      PostalCode: { value: salesOrder.shipPostalCode },
      Country: { value: salesOrder.shipCountry || "US" },
    },
    ShipToContact: contact(salesOrder),
  };
  if (links.salesOrderNbr) payload.OrderNbr = { value: links.salesOrderNbr };
  const custom = config.sendCustomFields
    ? customBlock("salesOrder", {
        ...salesOrder,
        dateQuoteRequested: draft.quote.dateQuoteRequested,
      })
    : undefined;
  if (custom) payload.custom = custom;
  return payload;
}

export function buildProductionOrderPayload(
  draft: Draft,
  config: MappingConfig,
  links: DocumentLinks = {},
): Payload {
  const production = draft.productionOrder;
  const payload: Payload = {
    OrderType: { value: production.orderType },
    InventoryID: { value: production.inventoryId },
    QtytoProduce: { value: Number(production.qtyToProduce) },
    UOM: { value: production.uom },
    Warehouse: { value: production.warehouse.trim() },
    Location: { value: production.location.trim() },
    OrderDescription: { value: productionDescription(draft, links) },
    Customer: { value: production.customerId },
    CostingMethod: { value: production.costingMethod },
    SchedulingMethod: { value: production.schedulingMethod },
    StartDate: { value: acumaticaDate(production.startDate) },
    EndDate: { value: acumaticaDate(production.endDate) },
    Constraint: { value: acumaticaDate(production.dueDate) },
    OrderDate: { value: acumaticaDate(draft.salesOrder.dateSoCreated) },
    WIPAccount: { value: accountCode(production.wipAccount) },
    WIPVarianceAccount: { value: accountCode(production.wipVarianceAccount) },
    SOOrderType: { value: config.salesOrderType },
    SOLineNbr: { value: 1 },
    Source: { value: config.productionSource },
    Hold: { value: config.createOnHold },
    note: { value: productionNote(draft, links) },
  };
  if (links.salesOrderNbr) payload.SOOrderNbr = { value: links.salesOrderNbr };
  const custom = config.sendCustomFields
    ? customBlock("productionOrder", production)
    : undefined;
  if (custom) payload.custom = custom;
  return payload;
}

export function buildProductionDetailPayload(draft: Draft, links: DocumentLinks = {}): Payload {
  const production = draft.productionOrder;
  return {
    OrderType: { value: production.orderType },
    ...(links.productionNbr ? { ProductionNbr: { value: links.productionNbr } } : {}),
    InventoryID: { value: production.inventoryId },
    QtytoProduce: { value: Number(production.qtyToProduce) },
    UOM: { value: production.uom },
    Warehouse: { value: production.warehouse.trim() },
    SchedulingMethod: { value: production.schedulingMethod },
    StartDate: { value: acumaticaDate(production.startDate) },
    EndDate: { value: acumaticaDate(production.endDate) },
    Operations: draft.operations.map((line) => {
      const run = estimatedHoursToRun(Number(line.estimatedHours));
      return {
        OperationNbr: { value: line.operationId },
        WorkCenter: { value: line.workCenter },
        OperationDescription: { value: line.description },
        RunUnits: { value: run.runUnits },
        RunTime: { value: run.runTimeMinutes },
      };
    }),
  };
}

function lineDetail(inventoryId: string, description: string, qty: number, draft: Draft): Payload {
  return {
    InventoryID: { value: inventoryId },
    OrderQty: { value: qty },
    UOM: { value: draft.productionOrder.uom },
    WarehouseID: { value: draft.productionOrder.warehouse.trim() },
    LineDescription: { value: truncate(description, 256) },
  };
}

function contact(values: Record<string, string>): Payload {
  return {
    Attention: { value: values.contactName },
    Phone1: { value: values.contactPhone },
    Email: { value: values.contactEmail },
  };
}

function contactId(id: string | undefined): Payload {
  if (id && /^\d+$/.test(id)) return { ContactID: { value: Number(id) } };
  return {};
}

function customBlock(scope: string, values: Record<string, string>): Payload | undefined {
  const spec = customFields[scope];
  if (!spec) return undefined;
  const views: Record<string, Record<string, { type: string; value: string }>> = {};
  for (const [key, binding] of Object.entries(spec)) {
    const raw = values[key];
    if (!raw?.trim()) continue;
    const value =
      binding.type === "CustomDateTimeField" && /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? acumaticaDate(raw)
        : raw.trim();
    views[binding.view] ??= {};
    views[binding.view][binding.field] = { type: binding.type, value };
  }
  return Object.keys(views).length ? views : undefined;
}

function quoteNote(draft: Draft, orderType: string): string {
  const quote = draft.quote;
  return joinLines([
    ["QTE machine sales quote", ""],
    ["Date quote requested", quote.dateQuoteRequested],
    ["Shipping arrangement", quote.shippingArrangement],
    ["Customer reference", quote.customerReferenceNumber],
    ["Contact", contactLine(quote)],
    ["Sales order type", orderType],
  ]);
}

function salesOrderNote(draft: Draft, orderType: string, quoteNbr?: string): string {
  const salesOrder = draft.salesOrder;
  return joinLines([
    ["QTE machine sales order", ""],
    ["Created from quote", quoteNbr ?? ""],
    ["Date quote accepted", salesOrder.dateQuoteAccepted],
    ["Date quote requested", draft.quote.dateQuoteRequested],
    ["Customer reference", salesOrder.customerReferenceNumber],
    ["Shipping arrangement", salesOrder.shippingArrangement],
    ["Contact", contactLine(salesOrder)],
    ["Sales order type", orderType],
  ]);
}

function productionNote(draft: Draft, links: DocumentLinks): string {
  const production = draft.productionOrder;
  return joinLines([
    ["QTE production order", ""],
    ["Order type", productionTypeLabel(production.orderType)],
    ["Machine serial number", production.machineSerialNumber],
    ["Quote", links.quoteNbr ?? ""],
    ["Sales order", links.salesOrderNbr ?? ""],
    ["Customer reference", draft.salesOrder.customerReferenceNumber],
    ["Shipping arrangement", draft.salesOrder.shippingArrangement],
    ["WIP account", production.wipAccount],
    ["WIP variance account", production.wipVarianceAccount],
  ]);
}

export function productionDescription(draft: Draft, links: DocumentLinks): string {
  const parts = [
    draft.salesOrder.description || draft.quote.description,
    draft.productionOrder.machineSerialNumber
      ? `SN ${draft.productionOrder.machineSerialNumber}`
      : "",
    links.quoteNbr ? `Quote ${links.quoteNbr}` : "",
    links.salesOrderNbr ? `SO ${links.salesOrderNbr}` : "",
  ].filter(Boolean);
  return truncate(parts.join(" | "), 256);
}

function contactLine(values: Record<string, string>): string {
  return [values.contactName, values.contactPhone, values.contactEmail].filter(Boolean).join(", ");
}

function joinLines(pairs: [string, string][]): string {
  return pairs
    .filter(([, value], index) => index === 0 || value.trim())
    .map(([label, value], index) => (index === 0 ? label : `${label}: ${value}`))
    .join("\n");
}
