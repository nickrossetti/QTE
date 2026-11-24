"use client";

import { useEffect, useState } from "react";
import type { CustomerOption, InventoryOption, TermsOption } from "@/server/acumatica/normalize";
import type { FieldDefinition } from "@/domain/fields";
import { overrideToken } from "@/domain/draft";
import { getJson } from "@/lib/api";
import { SearchSelect, type SearchOption } from "./SearchSelect";
import { inputClass } from "./ui";
import { useWizard } from "./wizard-context";

export function FieldControl({ field }: { field: FieldDefinition }) {
  const { draft, errors, updateField, restore } = useWizard();
  const values = draft[field.stage];
  const error = errors[`${field.stage}.${field.key}`];
  const overridden = field.copiedFrom ? draft.overrides.includes(overrideToken(field.stage, field.key)) : false;
  const id = `${field.stage}-${field.key}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-base font-semibold text-navy">
          {field.label}
          {field.required && (
            <span className="text-royal" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        {field.copiedFrom && (
          <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-royal">
            {overridden ? "Edited" : "Copied"}
          </span>
        )}
      </div>
      {field.lookup === "customer" ? (
        <CustomerLookup id={id} field={field} invalid={!!error} />
      ) : field.lookup === "inventory" ? (
        <InventoryLookup id={id} field={field} invalid={!!error} />
      ) : field.lookup === "terms" ? (
        <TermsLookup id={id} field={field} invalid={!!error} />
      ) : field.type === "select" ? (
        <select
          id={id}
          className={`${inputClass(!!error)} h-12`}
          value={values[field.key] ?? ""}
          onChange={(event) => updateField(field.stage, field.key, event.target.value)}
        >
          <option value="">Choose one</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          maxLength={field.maxLength}
          className={`${inputClass(!!error)} py-2`}
          placeholder={field.placeholder}
          value={values[field.key] ?? ""}
          onChange={(event) => updateField(field.stage, field.key, event.target.value)}
        />
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : field.type}
          inputMode={field.type === "number" ? "decimal" : undefined}
          min={field.type === "number" ? "0" : undefined}
          step={field.type === "number" ? "any" : undefined}
          autoComplete={field.autoComplete}
          maxLength={field.maxLength}
          className={`${inputClass(!!error)} h-12`}
          placeholder={field.placeholder}
          value={values[field.key] ?? ""}
          onChange={(event) => updateField(field.stage, field.key, event.target.value)}
        />
      )}
      {field.help && <p className="text-sm leading-snug text-slate-600">{field.help}</p>}
      {overridden && field.copiedFrom && (
        <button
          type="button"
          className="self-start text-sm font-semibold text-royal underline decoration-royal/40 underline-offset-2"
          onClick={() => restore(field.stage, field.key)}
        >
          Restore copied value
        </button>
      )}
      {error && (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CustomerLookup({ id, field, invalid }: { id: string; field: FieldDefinition; invalid: boolean }) {
  const { draft, updateField } = useWizard();
  const values = draft[field.stage];
  const collectsContact = field.stage === "quote" || field.stage === "salesOrder";
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [contacts, setContacts] = useState<CustomerOption["contacts"]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    const customerId = values.customerId;
    if (!collectsContact || !customerId) {
      setContacts([]);
      return;
    }
    let cancel = false;
    getJson<CustomerOption>(`/api/lookups/customers?id=${encodeURIComponent(customerId)}`)
      .then((customer) => {
        if (!cancel) setContacts(customer.contacts);
      })
      .catch(() => {
        if (!cancel) setContacts([]);
      });
    return () => {
      cancel = true;
    };
  }, [collectsContact, values.customerId]);

  async function search(query: string) {
    setLoading(true);
    setLookupError("");
    try {
      const rows = await getJson<CustomerOption[]>(`/api/lookups/customers?q=${encodeURIComponent(query)}`);
      setOptions(rows.map((row) => ({ value: row.id, label: row.name, hint: row.id })));
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "The customer search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchSelect
        id={id}
        value={values.customerId ?? ""}
        selectedLabel={values.customerName ? `${values.customerName} (${values.customerId})` : values.customerId ?? ""}
        options={options}
        placeholder="Search customers by name"
        loading={loading}
        invalid={invalid}
        emptyText="No customers match. Try another name, or ask for the customer to be added in Acumatica."
        onSearch={search}
        onChange={(option) => {
          const extras: Record<string, string> = { customerName: option.label };
          const same = option.value === values.customerId;
          if (!same && (field.stage === "quote" || field.stage === "salesOrder")) {
            extras.contactId = "";
            extras.contactName = "";
            extras.contactPhone = "";
            extras.contactEmail = "";
          }
          updateField(field.stage, "customerId", option.value, extras);
        }}
      />
      {lookupError && <p className="text-sm font-semibold text-red-700">{lookupError}</p>}
      {collectsContact && contacts.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-navy">
          Contact on file
          <select
            className={`${inputClass(false)} h-12 font-normal`}
            value={values.contactId ?? ""}
            onChange={(event) => {
              const contact = contacts.find((item, index) => (item.id || item.email || `${item.name}-${index}`) === event.target.value);
              if (!contact) return;
              updateField(field.stage, "contactName", contact.name, {
                contactId: contact.id,
                contactPhone: contact.phone,
                contactEmail: contact.email,
              });
            }}
          >
            <option value="">Choose a contact to fill in name, phone, and email</option>
            {contacts.map((contact, index) => {
              const contactKey = contact.id || contact.email || `${contact.name}-${index}`;
              return (
                <option key={contactKey} value={contactKey}>
                  {contact.name}
                </option>
              );
            })}
          </select>
        </label>
      )}
    </div>
  );
}

function InventoryLookup({ id, field, invalid }: { id: string; field: FieldDefinition; invalid: boolean }) {
  const { draft, updateField } = useWizard();
  const values = draft[field.stage];
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  async function search(query: string) {
    setLoading(true);
    setLookupError("");
    try {
      const rows = await getJson<InventoryOption[]>(`/api/lookups/inventory?q=${encodeURIComponent(query)}`);
      setOptions(rows.map((row) => ({ value: row.id, label: row.id, hint: row.description })));
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "The inventory search failed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = values.inventoryDescription
    ? `${values.inventoryId} — ${values.inventoryDescription}`
    : values.inventoryId ?? "";

  return (
    <>
      <SearchSelect
        id={id}
        value={values.inventoryId ?? ""}
        selectedLabel={selected}
        options={options}
        placeholder="Search inventory IDs"
        loading={loading}
        invalid={invalid}
        emptyText="That inventory ID is not in Acumatica yet. Ask the right person to create it before you submit."
        onSearch={search}
        onChange={(option) =>
          updateField(field.stage, "inventoryId", option.value, {
            inventoryDescription: option.hint ?? "",
          })
        }
      />
      {lookupError && <p className="text-sm font-semibold text-red-700">{lookupError}</p>}
    </>
  );
}

function TermsLookup({ id, field, invalid }: { id: string; field: FieldDefinition; invalid: boolean }) {
  const { draft, updateField } = useWizard();
  const values = draft[field.stage];
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  async function search(query: string) {
    setLoading(true);
    setLookupError("");
    try {
      const rows = await getJson<TermsOption[]>(`/api/lookups/terms?q=${encodeURIComponent(query)}`);
      setOptions(rows.map((row) => ({ value: row.id, label: row.description, hint: row.id })));
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "The terms search failed.");
    } finally {
      setLoading(false);
    }
  }

  const selected = values.paymentTermsDescription
    ? `${values.paymentTermsDescription} (${values.paymentTerms})`
    : values.paymentTerms ?? "";

  return (
    <>
      <SearchSelect
        id={id}
        value={values.paymentTerms ?? ""}
        selectedLabel={selected}
        options={options}
        placeholder="Search payment terms"
        loading={loading}
        invalid={invalid}
        onSearch={search}
        onChange={(option) =>
          updateField(field.stage, "paymentTerms", option.value, {
            paymentTermsDescription: option.label,
          })
        }
      />
      {lookupError && <p className="text-sm font-semibold text-red-700">{lookupError}</p>}
    </>
  );
}
