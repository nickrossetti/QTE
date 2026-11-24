export interface ContactOption {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  contacts: ContactOption[];
}

export interface InventoryOption {
  id: string;
  description: string;
}

export interface TermsOption {
  id: string;
  description: string;
}

export function readValue(node: unknown, ...keys: string[]): string {
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (value && typeof value === "object" && "value" in value) {
      const inner = (value as { value: unknown }).value;
      if (inner !== null && inner !== undefined && String(inner).trim() !== "") return String(inner);
    } else if (typeof value === "string" || typeof value === "number") {
      if (String(value).trim() !== "") return String(value);
    }
  }
  return "";
}

export function asArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["value", "Result", "results"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}

export function normalizeCustomers(payload: unknown): CustomerOption[] {
  return asArray(payload)
    .map((row) => {
      const id = readValue(row, "CustomerID", "Customer");
      const name = readValue(row, "CustomerName", "AccountName") || id;
      if (!id) return null;
      const contacts = uniqueContacts(collectContacts(row));
      return { id, name, contacts };
    })
    .filter((row): row is CustomerOption => !!row);
}

export function normalizeInventory(payload: unknown): InventoryOption[] {
  return asArray(payload)
    .map((row) => {
      const id = readValue(row, "InventoryID");
      if (!id) return null;
      return { id, description: readValue(row, "Description", "Descr") || id };
    })
    .filter((row): row is InventoryOption => !!row);
}

export function normalizeTerms(payload: unknown): TermsOption[] {
  return asArray(payload)
    .map((row) => {
      const id = readValue(row, "TermsID", "TermID", "Terms");
      if (!id) return null;
      return { id, description: readValue(row, "Description", "TermsDescription") || id };
    })
    .filter((row): row is TermsOption => !!row);
}

export function documentNumber(payload: unknown, key: string): string {
  return readValue(payload, key);
}

function collectContacts(row: unknown): ContactOption[] {
  if (!row || typeof row !== "object") return [];
  const record = row as Record<string, unknown>;
  const contacts: ContactOption[] = [];
  const main = record.MainContact ?? record.PrimaryContact;
  const mainContact = toContact(main);
  if (mainContact) contacts.push(mainContact);
  const list = record.Contacts ?? record.ContactDetails;
  if (Array.isArray(list)) {
    for (const item of list) {
      const contact = toContact(item);
      if (contact) contacts.push(contact);
    }
  }
  return contacts;
}

function toContact(node: unknown): ContactOption | null {
  if (!node || typeof node !== "object") return null;
  const name =
    readValue(node, "DisplayName", "Contact", "Attention", "FullName") ||
    [readValue(node, "FirstName"), readValue(node, "LastName")].filter(Boolean).join(" ");
  const email = readValue(node, "Email", "EmailAddress");
  const phone = readValue(node, "Phone1", "Phone", "Phone2");
  const id = readValue(node, "ContactID", "Contact");
  if (!name && !email && !phone) return null;
  return { id, name: name || email || "Contact", phone, email };
}

function uniqueContacts(contacts: ContactOption[]): ContactOption[] {
  const seen = new Set<string>();
  const unique: ContactOption[] = [];
  for (const contact of contacts) {
    const key = `${contact.id}|${contact.name}|${contact.email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(contact);
  }
  return unique;
}
