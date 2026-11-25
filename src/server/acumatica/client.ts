import type { AppConfig } from "../config";
import { AcumaticaError, acumaticaMessage } from "./errors";
import { cookieHeaderFromSetCookie, redactSecret } from "./cookies";
import {
  documentNumber,
  normalizeCustomers,
  normalizeInventory,
  normalizeTerms,
  type CustomerOption,
  type InventoryOption,
  type TermsOption,
} from "./normalize";
import { odataString } from "./odata";

export interface LoginResult {
  cookieHeader: string;
}

export class AcumaticaClient {
  constructor(
    private readonly config: AppConfig,
    private readonly cookieHeader: string,
  ) {}

  static async login(
    config: AppConfig,
    input: { username: string; password: string; tenant: string },
  ): Promise<LoginResult> {
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/entity/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: input.username,
          password: input.password,
          tenant: input.tenant,
          branch: config.branch,
          locale: config.locale,
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new AcumaticaError(
        503,
        "We couldn't reach Acumatica. Check the instance URL, or continue in demo mode.",
      );
    }

    if (response.status !== 204 && response.status !== 200) {
      const body = await readBody(response);
      throw new AcumaticaError(
        response.status,
        redactSecret(friendlyLogin(response.status, body), input.password),
      );
    }

    const setCookies = response.headers.getSetCookie?.() ?? [];
    const cookieHeader = cookieHeaderFromSetCookie(setCookies);
    if (!cookieHeader) {
      throw new AcumaticaError(
        502,
        "Acumatica signed in but did not return a session. Check the instance URL.",
      );
    }
    return { cookieHeader };
  }

  async logout(): Promise<void> {
    try {
      await this.request("/entity/auth/logout", { method: "POST" });
    } catch {
      // The local session is cleared either way.
    }
  }

  async searchCustomers(query: string): Promise<CustomerOption[]> {
    const term = query.trim();
    const filter = term
      ? `&$filter=substringof('${odataString(term)}',CustomerName) or substringof('${odataString(term)}',CustomerID)`
      : "";
    const rows = await this.getWithFallback(
      "Customer",
      `$top=25&$select=CustomerID,CustomerName&$expand=MainContact${filter}`,
      "$top=40&$expand=MainContact",
    );
    return filterCustomers(normalizeCustomers(rows), term).slice(0, 25);
  }

  async getCustomer(id: string): Promise<CustomerOption | null> {
    const rows = await this.getEntity(
      "Customer",
      `$top=1&$filter=CustomerID eq '${odataString(id)}'&$expand=MainContact,Contacts`,
    );
    return normalizeCustomers(rows)[0] ?? null;
  }

  async searchInventory(query: string): Promise<InventoryOption[]> {
    const [stock, nonStock] = await Promise.all([
      this.searchItems("StockItem", query).catch(() => [] as InventoryOption[]),
      this.searchItems("NonStockItem", query).catch(() => [] as InventoryOption[]),
    ]);
    const merged = new Map<string, InventoryOption>();
    for (const item of [...stock, ...nonStock]) merged.set(item.id, item);
    return [...merged.values()].slice(0, 25);
  }

  async searchTerms(query: string): Promise<TermsOption[]> {
    let lastError: AcumaticaError | null = null;
    for (const entity of ["CreditTerms", "Terms"]) {
      try {
        const rows = await this.getEntity(entity, "$top=100&$select=TermsID,Description");
        const terms = filterTerms(normalizeTerms(rows), query);
        if (terms.length || !query.trim()) return terms;
      } catch (error) {
        if (error instanceof AcumaticaError && (error.status === 404 || error.status === 400)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw new AcumaticaError(
      lastError?.status ?? 404,
      "Credit terms are not on this Acumatica endpoint yet. An administrator needs to add the Credit Terms entity. See the README.",
    );
  }

  async putSalesOrder(body: unknown): Promise<{ orderType: string; orderNbr: string }> {
    const payload = await this.request(this.defaultPath("SalesOrder"), {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return readOrder(payload, "Sales order");
  }

  async convertQuote(orderType: string, orderNbr: string, targetType: string): Promise<{ orderType: string; orderNbr: string }> {
    const payload = await this.request(this.defaultPath(`SalesOrder/${this.config.convertQuoteAction}`), {
      method: "POST",
      body: JSON.stringify({
        entity: {
          OrderType: { value: orderType },
          OrderNbr: { value: orderNbr },
        },
        parameters: {
          OrderType: { value: targetType },
        },
      }),
    });
    return readOrder(payload, "Converted sales order");
  }

  async putProductionOrder(body: unknown): Promise<{ orderType: string; productionNbr: string }> {
    const payload = await this.request(this.manufacturingPath("ProductionOrder"), {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const productionNbr = documentNumber(payload, "ProductionNbr");
    const orderType = documentNumber(payload, "OrderType");
    if (!productionNbr) {
      throw new AcumaticaError(502, "Acumatica created a production order but did not return its number.");
    }
    return { orderType, productionNbr };
  }

  async putProductionDetail(body: unknown): Promise<void> {
    await this.request(
      `${this.manufacturingPath("ProductionOrderDetail")}?$expand=Operations`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  }

  private async searchItems(entity: string, query: string): Promise<InventoryOption[]> {
    const term = query.trim();
    const filter = term
      ? `&$filter=substringof('${odataString(term)}',InventoryID) or substringof('${odataString(term)}',Description)`
      : "";
    const rows = await this.getWithFallback(
      entity,
      `$top=20&$select=InventoryID,Description${filter}`,
      "$top=40&$select=InventoryID,Description",
    );
    return filterInventory(normalizeInventory(rows), term);
  }

  private async getWithFallback(entity: string, query: string, fallbackQuery: string): Promise<unknown> {
    try {
      return await this.getEntity(entity, query);
    } catch (error) {
      if (!(error instanceof AcumaticaError) || (error.status !== 400 && error.status !== 500)) throw error;
      return this.getEntity(entity, fallbackQuery);
    }
  }

  private getEntity(entity: string, query: string): Promise<unknown> {
    return this.request(`${this.defaultPath(entity)}?${query}`, { method: "GET" });
  }

  private defaultPath(entity: string): string {
    return `/entity/${this.config.defaultEndpoint}/${this.config.defaultVersion}/${entity}`;
  }

  private manufacturingPath(entity: string): string {
    return `/entity/${this.config.manufacturingEndpoint}/${this.config.manufacturingVersion}/${entity}`;
  }

  private async request(path: string, init: { method: string; body?: string }): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        method: init.method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Cookie: this.cookieHeader,
        },
        body: init.body,
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      throw new AcumaticaError(503, "We couldn't reach Acumatica. Check your connection and try again.");
    }
    if (response.status === 401) {
      throw new AcumaticaError(
        401,
        "Your Acumatica session has expired. Sign in again. The quote is still on this device.",
      );
    }
    const body = await readBody(response);
    if (!response.ok) {
      throw new AcumaticaError(response.status, acumaticaMessage(response.status, body));
    }
    return body;
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function friendlyLogin(status: number, body: unknown): string {
  if (status === 429) return "Acumatica is limiting sign-ins right now. Wait a moment and try again.";
  const message = acumaticaMessage(status, body);
  if (
    status === 401 ||
    status === 403 ||
    /credential|password|invalid login|incorrect|cannot log|unable to log/i.test(message)
  ) {
    return "Acumatica did not accept that username or password for the selected tenant.";
  }
  if (message && !message.startsWith("Acumatica returned status")) return message;
  return "Acumatica did not accept that username or password for the selected tenant.";
}

function readOrder(payload: unknown, label: string): { orderType: string; orderNbr: string } {
  const orderNbr = documentNumber(payload, "OrderNbr");
  const orderType = documentNumber(payload, "OrderType");
  if (!orderNbr) {
    throw new AcumaticaError(502, `${label} was saved, but Acumatica did not return the order number.`);
  }
  return { orderType, orderNbr };
}

function filterCustomers(customers: CustomerOption[], term: string): CustomerOption[] {
  if (!term) return customers;
  const needle = term.toLowerCase();
  const matched = customers.filter(
    (customer) => customer.name.toLowerCase().includes(needle) || customer.id.toLowerCase().includes(needle),
  );
  return matched;
}

function filterInventory(items: InventoryOption[], term: string): InventoryOption[] {
  if (!term) return items;
  const needle = term.toLowerCase();
  return items.filter(
    (item) => item.id.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle),
  );
}

function filterTerms(items: TermsOption[], term: string): TermsOption[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return items;
  return items.filter(
    (item) => item.id.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle),
  );
}
