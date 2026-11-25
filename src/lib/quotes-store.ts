import { carryForward, emptyDraft } from "@/domain/draft";
import type { Draft, SubmitResult } from "@/domain/types";

const KEY = "qte.quotes.v1";

export interface SavedQuote {
  id: string;
  number: string;
  status: "draft" | "sent";
  createdAt: string;
  updatedAt: string;
  draft: Draft;
  result?: SubmitResult | null;
}

export function loadQuotes(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const sample = sampleQuote();
      localStorage.setItem(KEY, JSON.stringify([sample]));
      return [sample];
    }
    const parsed = JSON.parse(raw) as SavedQuote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuotes(quotes: SavedQuote[]) {
  localStorage.setItem(KEY, JSON.stringify(quotes));
}

export function getQuote(id: string): SavedQuote | null {
  return loadQuotes().find((quote) => quote.id === id) ?? null;
}

export function upsertQuote(quote: SavedQuote) {
  const quotes = loadQuotes();
  const index = quotes.findIndex((item) => item.id === quote.id);
  if (index >= 0) quotes[index] = quote;
  else quotes.unshift(quote);
  saveQuotes(quotes);
}

export function createQuote(): SavedQuote {
  const quotes = loadQuotes();
  const quote: SavedQuote = {
    id: crypto.randomUUID(),
    number: nextNumber(quotes),
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    draft: emptyDraft(),
    result: null,
  };
  quotes.unshift(quote);
  saveQuotes(quotes);
  return quote;
}

export function copyQuote(id: string): SavedQuote | null {
  const source = getQuote(id);
  if (!source) return null;
  const quotes = loadQuotes();
  const draft = carryForward(structuredClone(source.draft));
  if (draft.quote.description) draft.quote.description = `Copy of ${draft.quote.description}`;
  const quote: SavedQuote = {
    id: crypto.randomUUID(),
    number: nextNumber(quotes),
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    draft,
    result: null,
  };
  quotes.unshift(quote);
  saveQuotes(quotes);
  return quote;
}

function nextNumber(quotes: SavedQuote[]): string {
  const max = quotes.reduce((highest, quote) => {
    const match = /Q-(\d+)/.exec(quote.number);
    return Math.max(highest, match ? Number(match[1]) : 0);
  }, 0);
  return `Q-${String(max + 1).padStart(5, "0")}`;
}

function sampleQuote(): SavedQuote {
  const draft = emptyDraft(new Date("2026-11-06T12:00:00"));
  draft.productionOrder.orderType = "MN";
  draft.productionOrder.qtyToProduce = "1";
  draft.productionOrder.machineSerialNumber = "SAMPLE-SN";
  draft.productionOrder.startDate = "2026-12-01";
  draft.productionOrder.endDate = "2027-01-15";
  draft.quote.customerId = "NORTH";
  draft.quote.customerName = "Northline Mining Co.";
  draft.quote.contactName = "Ada Lovelace";
  draft.quote.contactPhone = "(555) 010-1000";
  draft.quote.contactEmail = "ada@northline.example";
  draft.quote.description = "SAMPLE - Q-Ram style track machine (walkthrough only, not a real quote)";
  draft.quote.inventoryId = "QTE-TRK-48";
  draft.quote.inventoryDescription = "Track Machine 48 in";
  draft.quote.customerReferenceNumber = "SAMPLE-LOI";
  draft.quote.requiredDeliveryDate = "2027-02-15";
  draft.quote.paymentTerms = "NET30";
  draft.quote.paymentTermsDescription = "Net 30";
  draft.quote.shippingArrangement = "Customer Pickup";
  draft.salesOrder.dateQuoteAccepted = "2026-11-20";
  draft.salesOrder.poNumber = "SAMPLE-PO";
  draft.salesOrder.shipAddressLine1 = "100 Quarry Road";
  draft.salesOrder.shipCity = "Duluth";
  draft.salesOrder.shipState = "MN";
  draft.salesOrder.shipPostalCode = "55802";
  draft.operations = [
    { id: "sample-1", operationId: "000", workCenter: "00", description: "Mobilization", estimatedHours: "8" },
    { id: "sample-2", operationId: "010", workCenter: "10", description: "Disassembly", estimatedHours: "16" },
    { id: "sample-3", operationId: "090", workCenter: "90", description: "Track Test", estimatedHours: "8" },
  ];
  return {
    id: "sample-quote",
    number: "Q-00001",
    status: "draft",
    createdAt: "2026-11-06T12:00:00.000Z",
    updatedAt: "2026-11-06T12:00:00.000Z",
    draft: carryForward(draft),
    result: null,
  };
}
