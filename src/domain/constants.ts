/** Defaults from the QTE quoting spreadsheet. Account fields keep the label employees see. */
export const DEFAULTS = {
  uom: "EA",
  warehouse: "1",
  location: "MAIN",
  costingMethod: "Estimated",
  schedulingMethod: "User Dates",
  wipAccount: "1215 - Work-In-Process MFG",
  wipVarianceAccount: "5910 - WIP MFG Variance",
  country: "US",
} as const;

export const HOURS_PER_RUN = 8;
/** What the estimator sees. Acumatica's run time cannot exceed 23:59. */
export const RUN_TIME_DISPLAY = "8:00";
/** Contract API stores run time as minutes. 8:00 = 480. */
export const RUN_TIME_MINUTES = HOURS_PER_RUN * 60;

export const SALES_ORDER_TYPE = "MS";

export const PRODUCTION_ORDER_TYPES = [
  { value: "MN", label: "MN — Manufacture" },
  { value: "RM", label: "RM — Remanufacture" },
  { value: "RC", label: "RC — Recondition" },
  { value: "RP", label: "RP — Repair" },
] as const;

export const SHIPPING_ARRANGEMENTS = [
  { value: "Customer Pickup", label: "Customer Pickup" },
  { value: "Third Party arranged by Customer", label: "Third Party arranged by Customer" },
  { value: "Third Party arranged by QTE", label: "Third Party arranged by QTE" },
] as const;

export const COSTING_METHODS = [
  { value: "Estimated", label: "Estimated" },
  { value: "Actual", label: "Actual" },
  { value: "Standard", label: "Standard" },
] as const;

export const SCHEDULING_METHODS = [
  { value: "User Dates", label: "User Dates" },
  { value: "Start On", label: "Start On" },
  { value: "Finish On", label: "Finish On" },
] as const;

export const STEP_COPY = {
  quote: {
    title: "Sales quote",
    intro:
      "Start the machine-sales quote. It is created as sales order type MS so machine sales stay separate from parts sales.",
  },
  salesOrder: {
    title: "Sales order",
    intro:
      "Most of this is copied from the quote. Check it, then add the ship-to address and the customer's PO number.",
  },
  productionOrder: {
    title: "Production order",
    intro:
      "This becomes the manufacturing order. Warehouse, location, costing, scheduling, and the WIP accounts are filled in with QTE's defaults.",
  },
  operations: {
    title: "Operations",
    intro:
      "Build the operation sequence for this production order. Pick a description and enter the total estimated hours for that work center.",
    conversion:
      "Max run time is 23:59 hours. Enter the total estimated hours for each work center. The app divides that number by 8 and puts the result in Run Units, then puts 8:00 in Run Time.",
    materials: "Materials will be entered in a later process. You do not need to add them here.",
  },
  review: {
    title: "Review and submit",
    intro: "Check every section. Nothing is sent to Acumatica until you submit.",
  },
} as const;
