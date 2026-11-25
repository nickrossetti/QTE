export interface AppConfig {
  baseUrl: string;
  tenants: string[];
  defaultEndpoint: string;
  defaultVersion: string;
  manufacturingEndpoint: string;
  manufacturingVersion: string;
  quoteOrderType: string;
  salesOrderType: string;
  convertQuoteAction: string;
  branch: string;
  locale: string;
  createOnHold: boolean;
  sendCustomFields: boolean;
  productionSource: string;
  demoOnly: boolean;
  sessionSecret: string;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const tenants = (env.ACUMATICA_TENANTS || "Quality Track Equipment|Quality Track Equipment - Test")
    .split("|")
    .map((tenant) => tenant.trim())
    .filter(Boolean);

  return {
    baseUrl: (env.ACUMATICA_BASE_URL || "https://qualitytrackequipment.acumatica.com").replace(
      /\/$/,
      "",
    ),
    tenants,
    defaultEndpoint: env.ACUMATICA_DEFAULT_ENDPOINT || "Default",
    defaultVersion: env.ACUMATICA_DEFAULT_VERSION || "24.200.001",
    manufacturingEndpoint: env.ACUMATICA_MANUFACTURING_ENDPOINT || "MANUFACTURING",
    manufacturingVersion: env.ACUMATICA_MANUFACTURING_VERSION || "24.200.001",
    quoteOrderType: env.ACUMATICA_QUOTE_ORDER_TYPE || "MS",
    salesOrderType: env.ACUMATICA_SALES_ORDER_TYPE || "MS",
    convertQuoteAction: env.ACUMATICA_CONVERT_QUOTE_ACTION || "ConvertQuoteToOrder",
    branch: env.ACUMATICA_BRANCH || "",
    locale: env.ACUMATICA_LOCALE || "en-US",
    createOnHold: (env.ACUMATICA_CREATE_ON_HOLD || "true") !== "false",
    sendCustomFields: (env.ACUMATICA_SEND_CUSTOM_FIELDS || "false") === "true",
    productionSource: env.ACUMATICA_PRODUCTION_SOURCE || "Sales Order",
    demoOnly: (env.QTE_DEMO_ONLY || "false") === "true",
    sessionSecret: env.SESSION_SECRET || "",
  };
}
