import {
  buildProductionDetailPayload,
  buildProductionOrderPayload,
  buildQuotePayload,
  buildSalesOrderPayload,
  type MappingConfig,
} from "@/domain/mapping";
import type { Draft, SubmitResult } from "@/domain/types";
import { AcumaticaClient } from "./acumatica/client";
import { AcumaticaError, PartialSubmitError, isMissingAction } from "./acumatica/errors";
import type { AppConfig } from "./config";

export async function submitLive(config: AppConfig, cookieHeader: string, draft: Draft): Promise<SubmitResult> {
  const client = new AcumaticaClient(config, cookieHeader);
  const mapping = mappingConfig(config);
  const created: PartialSubmitError["created"] = {};

  let quote;
  try {
    quote = await client.putSalesOrder(buildQuotePayload(draft, mapping));
  } catch (error) {
    throw asAcumatica(error);
  }
  created.quote = quote;

  let salesOrder: SubmitResult["salesOrder"];
  try {
    salesOrder = await createSalesOrder(client, draft, mapping, quote);
  } catch (error) {
    if (error instanceof PartialSubmitError) throw error;
    throw new PartialSubmitError(messageOf(error), created);
  }
  created.salesOrder = salesOrder;

  let production;
  try {
    production = await client.putProductionOrder(
      buildProductionOrderPayload(draft, mapping, {
        quoteNbr: quote.orderNbr,
        salesOrderNbr: salesOrder.orderNbr,
      }),
    );
  } catch (error) {
    throw new PartialSubmitError(messageOf(error), created);
  }
  created.productionOrder = production;

  try {
    await client.putProductionDetail(
      buildProductionDetailPayload(draft, {
        productionNbr: production.productionNbr,
      }),
    );
  } catch (error) {
    throw new PartialSubmitError(
      `The production order was created, but the operations were not saved. ${messageOf(error)}`,
      created,
    );
  }

  return {
    mode: "live",
    quote,
    salesOrder,
    productionOrder: production,
    operationCount: draft.operations.length,
  };
}

export function submitDemo(config: AppConfig, draft: Draft): SubmitResult {
  const quoteNbr = demoNumber("MS");
  const salesNbr = demoNumber("MS");
  const productionNbr = demoNumber("PR");
  const method = config.quoteOrderType === config.salesOrderType ? "copied" : "converted";
  return {
    mode: "demo",
    quote: { orderType: config.quoteOrderType, orderNbr: quoteNbr },
    salesOrder: { orderType: config.salesOrderType, orderNbr: salesNbr, method },
    productionOrder: { orderType: draft.productionOrder.orderType, productionNbr },
    operationCount: draft.operations.length,
  };
}

async function createSalesOrder(
  client: AcumaticaClient,
  draft: Draft,
  mapping: MappingConfig,
  quote: { orderType: string; orderNbr: string },
): Promise<SubmitResult["salesOrder"]> {
  if (mapping.quoteOrderType !== mapping.salesOrderType) {
    try {
      const converted = await client.convertQuote(quote.orderType, quote.orderNbr, mapping.salesOrderType);
      const updated = await client.putSalesOrder(
        buildSalesOrderPayload(draft, mapping, {
          quoteNbr: quote.orderNbr,
          salesOrderNbr: converted.orderNbr,
        }),
      );
      return { ...updated, method: "converted" };
    } catch (error) {
      if (!(error instanceof AcumaticaError) || !isMissingAction(error)) throw error;
      const copied = await client.putSalesOrder(
        buildSalesOrderPayload(draft, mapping, { quoteNbr: quote.orderNbr }),
      );
      return { ...copied, method: "copied" };
    }
  }

  const copied = await client.putSalesOrder(
    buildSalesOrderPayload(draft, mapping, { quoteNbr: quote.orderNbr }),
  );
  return { ...copied, method: "copied" };
}

function mappingConfig(config: AppConfig): MappingConfig {
  return {
    quoteOrderType: config.quoteOrderType,
    salesOrderType: config.salesOrderType,
    createOnHold: config.createOnHold,
    sendCustomFields: config.sendCustomFields,
    productionSource: config.productionSource,
  };
}

let demoSequence = 0;

function demoNumber(prefix: string): string {
  demoSequence += 1;
  const stamp = Date.now().toString().slice(-5);
  return `${prefix}${stamp}${String(demoSequence).padStart(2, "0")}`;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Acumatica could not save this quote.";
}

function asAcumatica(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("Acumatica could not save this quote.");
}
