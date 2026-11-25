import type { Stage } from "./types";

export interface JobFieldRef {
  stage: Stage;
  key: string;
}

export interface JobSection {
  id: string;
  title: string;
  intro?: string;
  /** Hidden until the estimator opens More details. These fields have defaults. */
  more?: boolean;
  fields: JobFieldRef[];
}

/**
 * What an estimator sees on the job step.
 * Copied fields are not listed again. They follow the source field automatically.
 * Add a field here after you add it to the field catalog.
 */
export const JOB_SECTIONS: JobSection[] = [
  {
    id: "customer",
    title: "Customer",
    fields: [
      { stage: "quote", key: "customerId" },
      { stage: "quote", key: "contactName" },
      { stage: "quote", key: "contactPhone" },
      { stage: "quote", key: "contactEmail" },
    ],
  },
  {
    id: "machine",
    title: "Job / machine",
    fields: [
      { stage: "quote", key: "description" },
      { stage: "quote", key: "inventoryId" },
      { stage: "productionOrder", key: "qtyToProduce" },
      { stage: "productionOrder", key: "machineSerialNumber" },
      { stage: "quote", key: "customerReferenceNumber" },
    ],
  },
  {
    id: "when",
    title: "When",
    fields: [
      { stage: "quote", key: "requiredDeliveryDate" },
      { stage: "salesOrder", key: "dateQuoteAccepted" },
      { stage: "productionOrder", key: "startDate" },
      { stage: "productionOrder", key: "endDate" },
    ],
  },
  {
    id: "ship",
    title: "Shipping and payment",
    fields: [
      { stage: "quote", key: "paymentTerms" },
      { stage: "quote", key: "shippingArrangement" },
      { stage: "salesOrder", key: "shipAddressLine1" },
      { stage: "salesOrder", key: "shipCity" },
      { stage: "salesOrder", key: "shipState" },
      { stage: "salesOrder", key: "shipPostalCode" },
      { stage: "salesOrder", key: "poNumber" },
    ],
  },
  {
    id: "more",
    title: "More details",
    more: true,
    intro: "These are already filled in. Open this only if this job is different from a normal machine sale.",
    fields: [
      { stage: "quote", key: "dateQuoted" },
      { stage: "quote", key: "dateQuoteRequested" },
      { stage: "salesOrder", key: "dateSoCreated" },
      { stage: "salesOrder", key: "shipAddressLine2" },
      { stage: "salesOrder", key: "shipCountry" },
      { stage: "productionOrder", key: "dueDate" },
      { stage: "productionOrder", key: "uom" },
      { stage: "productionOrder", key: "warehouse" },
      { stage: "productionOrder", key: "location" },
      { stage: "productionOrder", key: "costingMethod" },
      { stage: "productionOrder", key: "schedulingMethod" },
      { stage: "productionOrder", key: "wipAccount" },
      { stage: "productionOrder", key: "wipVarianceAccount" },
    ],
  },
];

export const JOB_TYPES = [
  { value: "MN", title: "Manufacturing", hint: "Build new (MN orders)" },
  { value: "RM", title: "Remanufacturing", hint: "Rebuild a machine (RM orders)" },
  { value: "RC", title: "Recondition", hint: "Recondition (RC orders)" },
  { value: "RP", title: "Repair", hint: "Fix / service (RP orders)" },
] as const;
