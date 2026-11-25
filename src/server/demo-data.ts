import demo from "../../data/demo-lookups.json";
import type { CustomerOption, InventoryOption, TermsOption } from "./acumatica/normalize";

const customers = demo.customers as CustomerOption[];
const inventory = demo.inventory as InventoryOption[];
const terms = demo.terms as TermsOption[];

export function demoCustomers(query: string): CustomerOption[] {
  return filter(customers, query, (customer) => `${customer.name} ${customer.id}`).map((customer) => ({
    ...customer,
    contacts: [],
  }));
}

export function demoCustomer(id: string): CustomerOption | null {
  return customers.find((customer) => customer.id === id) ?? null;
}

export function demoInventory(query: string): InventoryOption[] {
  return filter(inventory, query, (item) => `${item.id} ${item.description}`);
}

export function demoTerms(query: string): TermsOption[] {
  return filter(terms, query, (item) => `${item.id} ${item.description}`);
}

function filter<T>(rows: T[], query: string, text: (row: T) => string): T[] {
  const needle = query.trim().toLowerCase();
  const matched = needle ? rows.filter((row) => text(row).toLowerCase().includes(needle)) : rows;
  return matched.slice(0, 25);
}
