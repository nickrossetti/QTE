# QTE Sales Quoting

Web app Quality Track Equipment estimators use to build a machine-sales quote, copy it to a sales order, and create the production order and its operations in Acumatica.

The flow is one guided path: **Quote → Sales Order → Production Order → Operations → Review**. Nothing is sent to Acumatica until the estimator submits the review screen.

Licensed under the [MIT License](LICENSE).

## What it does

- Every employee signs in with their own Acumatica username, password, and tenant. Passwords are used for that sign-in request only and are never stored.
- Customers (with contacts), inventory IDs, and payment terms are looked up live from Acumatica.
- Machine sales use sales order type **MS**.
- Fields marked required in the quoting workbook are required here, with the workbook notes shown under the fields.
- Copied fields carry forward from quote to sales order to production order. An estimator can edit a copied value and restore it.
- Defaults: UoM `EA`, warehouse `1`, location `MAIN`, costing method `Estimated`, scheduling method `User Dates`, WIP account `1215 - Work-In-Process MFG`, WIP variance account `5910 - WIP MFG Variance`.
- Production order types: MN Manufacture, RM Remanufacture, RC Recondition, RP Repair.
- Shipping arrangements: Customer Pickup, Third Party arranged by Customer, Third Party arranged by QTE.
- The operations list is loaded from [`data/operations.json`](data/operations.json). Picking a description fills Operation ID and Work Center. Operation IDs keep their leading zeros (`000`, `010`, …).
- Estimated hours for a work center become **Run Units = hours / 8** and **Run Time = 8:00**, because Acumatica’s maximum run time is 23:59. The contract API receives run time as 480 minutes.
- Materials are out of scope.
- **Demo mode** runs the whole path with sample customers, inventory, and terms and does not call Acumatica.

## Run it locally

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Choose **Continue in demo mode** to try the quote without credentials.

```bash
npm test        # hours conversion, field mapping, validation, session cookie
npm run build   # production build
npm start
```

### Environment

Copy [`.env.example`](.env.example). The important values:

| Variable | Purpose |
| --- | --- |
| `ACUMATICA_BASE_URL` | Instance URL, no trailing slash. Default `https://qualitytrackequipment.acumatica.com`. |
| `ACUMATICA_TENANTS` | Tenant login names, separated by `\|`. |
| `ACUMATICA_DEFAULT_ENDPOINT` / `ACUMATICA_DEFAULT_VERSION` | Contract endpoint for customers, items, terms, and sales orders. Default `Default` / `24.200.001`. |
| `ACUMATICA_MANUFACTURING_ENDPOINT` / `ACUMATICA_MANUFACTURING_VERSION` | Manufacturing endpoint. Default `MANUFACTURING` / `24.200.001`. |
| `ACUMATICA_QUOTE_ORDER_TYPE` | Order type for the quote. Default `MS`. |
| `ACUMATICA_SALES_ORDER_TYPE` | Order type for the sales order. Default `MS`. |
| `ACUMATICA_CONVERT_QUOTE_ACTION` | Action used when the quote type and sales order type differ. Default `ConvertQuoteToOrder`. |
| `ACUMATICA_CREATE_ON_HOLD` | Create documents on hold. Default `true`. |
| `ACUMATICA_SEND_CUSTOM_FIELDS` | Also write user-defined fields from [`config/custom-fields.json`](config/custom-fields.json). Default `false`. |
| `SESSION_SECRET` | Required for live sign-in. Encrypts the Acumatica session cookie. Generate with `openssl rand -base64 32`. |
| `QTE_DEMO_ONLY` | `true` hides the password form. |

Set `SESSION_SECRET` in production. Without it, live sign-in is refused and demo mode still works.

## Deploy

This is a Next.js app. On Vercel, import the repository, set the environment variables above, and deploy. The browser talks only to this app. The server calls Acumatica, so the instance does not need CORS changes.

Use the **Quality Track Equipment - Test** tenant until a quote, a sales order, and a production order with operations have been checked by hand.

## How sign-in works

The app uses Acumatica’s contract-based REST API with cookie sessions:

`POST {ACUMATICA_BASE_URL}/entity/auth/login`

The body is the employee’s username, password, tenant, optional branch, and locale. Acumatica returns `204` and `Set-Cookie` headers. Those cookies are encrypted into an httpOnly cookie on this app. Later requests send them back to Acumatica. Sign-out calls `POST /entity/auth/logout` and clears the local cookie.

The password is not written to the session cookie, to disk, or to logs. A live session cannot be forged from the demo-mode key.

Cookie login was chosen instead of OAuth because each employee signs in as themselves and there is no connected-application secret to distribute. Acumatica has said direct username/password sign-in may be removed in a future version. When that happens, add a Connected Application (Authorization Code or Resource Owner Password) and replace `AcumaticaClient.login` in [`src/server/acumatica/client.ts`](src/server/acumatica/client.ts). The wizard and the field mapping stay the same.

Two-factor authentication is bypassed by `/entity/auth/login` (Acumatica’s documented behavior). Confirm license limits for concurrent API sessions before rolling this out to the whole team.

## What an Acumatica administrator must configure

Do this before anyone uses live mode.

1. **Confirm the site URL.** The default is `https://qualitytrackequipment.acumatica.com`. Set `ACUMATICA_BASE_URL` if it differs. No trailing slash.

2. **Tenants (SM203520).** The Login Name must match the picker exactly:
   - `Quality Track Equipment`
   - `Quality Track Equipment - Test`
   
   Change `ACUMATICA_TENANTS` if the login names differ. Separate names with `|`.

3. **Web Service Endpoints (SM207060).** Note the endpoint name and version that are actually published, and set the env vars to match. Current defaults are `Default/24.200.001` and `MANUFACTURING/24.200.001`. Extend the system endpoint instead of editing it in place. Manufacturing Edition has to be licensed so the `MANUFACTURING` endpoint exists.

4. **Credit terms lookup.** The Default endpoint often does not expose credit terms. Extend it with an entity named `CreditTerms` (the app also tries `Terms`) mapped to Credit Terms (CS206000), with fields `TermsID` and `Description`. Until that entity exists, the payment-terms search returns a clear error. Demo mode does not need it.

5. **Confirm these contract fields exist** (they do on current Manufacturing endpoints; a trimmed custom endpoint may not):
   - Sales order: `OrderType`, `OrderNbr`, `CustomerID`, `CustomerOrder`, `Date`, `RequestedOn`, `Description`, `Hold`, `ContactID`, `Details` (`InventoryID`, `OrderQty`, `UOM`, `WarehouseID`), `FinancialSettings.Terms`, `ShipToAddress`, `ShipToContact`, `note`.
   - Production order: `OrderType`, `ProductionNbr`, `InventoryID`, `QtytoProduce`, `UOM`, `Warehouse`, `Location`, `OrderDescription`, `Customer`, `CostingMethod`, `SchedulingMethod`, `StartDate`, `EndDate`, `Constraint`, `OrderDate`, `WIPAccount`, `WIPVarianceAccount`, `SOOrderType`, `SOOrderNbr`, `SOLineNbr`, `Source`, `Hold`, `note`.
   - Production order detail, expanded with `Operations`: `OperationNbr`, `WorkCenter`, `OperationDescription`, `RunUnits`, `RunTime`.

6. **Sales order type MS (SO201000).** Machine sales use type `MS` so they stay separate from parts sales. Both the quote and the sales order default to `MS`. When both types are `MS`, the app creates two MS documents and links them in the description and the note (a quote order type cannot be converted into itself). To use Acumatica’s convert action instead, create a quote-behavior order type, set `ACUMATICA_QUOTE_ORDER_TYPE` to it, leave `ACUMATICA_SALES_ORDER_TYPE=MS`, and confirm the action name (`ConvertQuoteToOrder`, or whatever `ACUMATICA_CONVERT_QUOTE_ACTION` is). If that action is missing, the app creates the sales order directly and says so.

7. **Production order types.** MN, RM, RC, and RP need to exist. Warehouse `1`, location `MAIN`, WIP account `1215`, and WIP variance account `5910` need to exist. Costing method `Estimated` and scheduling method `User Dates` need to be allowed. The app sends the account code (`1215`, `5910`) and shows employees the full label.

8. **Work centers.** Every work center in [`data/operations.json`](data/operations.json) must exist, including `00`, `10`, `OP10`, and `OP20`. Operation numbers are sent with leading zeros (`010`, not `10`).

9. **Employees.** Each person uses their own Acumatica user. They need access to the tenant and rights to Sales Orders (SO301000), Customers, stock and non-stock items, Credit Terms, and Production Orders. Do not share one integration password. Check the license for concurrent API sessions (System Management, License Monitoring).

10. **Optional user-defined fields.** Shipping arrangement, the quote dates, the customer reference, and the machine serial are always written to the document note, so the data is in Acumatica even before custom fields exist. To put them in their own fields, add these user-defined fields and the matching fields on the extended endpoint, then set `ACUMATICA_SEND_CUSTOM_FIELDS=true`:

    | Document | Field | Suggested name |
    | --- | --- | --- |
    | Sales order / quote | Shipping arrangement | `UsrShippingArrangement` |
    | Sales order / quote | Date quote requested | `UsrDateQuoteRequested` |
    | Sales order | Date quote accepted | `UsrDateQuoteAccepted` |
    | Sales order / quote | Customer reference | `UsrCustomerReference` |
    | Production order | Machine serial number | `UsrMachineSerialNumber` |

    View names default to `Document` on the sales order and `ProdItem` on the production order. Change them in [`config/custom-fields.json`](config/custom-fields.json) if the customization project uses different views. Leave the flag `false` until the fields exist. Acumatica rejects the whole save if a custom field name is unknown.

11. **Hold.** Documents are created on hold (`ACUMATICA_CREATE_ON_HOLD=true`) so nothing is released by accident.

12. **Dates.** Dates are sent as `YYYY-MM-DDT00:00:00` with no timezone suffix, so Acumatica does not shift them back a day.

13. **Run time on 25R2.** Some 25R2 builds ignore `RunUnits` and `RunTime` on `ProductionOrderDetail`. If hours do not stick, check the Acumatica build. The app sends Run Units = hours / 8 and Run Time = `480` (minutes). The screen shows that as `8:00`.

14. **CORS is not required.** The browser never calls Acumatica directly.

15. **Session secret.** Set `SESSION_SECRET` on the server before live sign-in. It encrypts the cookie jar. It is not the Acumatica password.

## How a quote is saved

On submit the server validates the draft again, then:

1. `PUT /entity/Default/{version}/SalesOrder` with order type MS (the quote). Customer reference goes to Customer Order. Payment terms go to `FinancialSettings.Terms`.
2. Creates the sales order. PO Number goes to Customer Order. The customer reference stays in the note (and in `UsrCustomerReference` when custom fields are on). The ship-to address and contact are sent here.
3. `PUT /entity/MANUFACTURING/{version}/ProductionOrder`, linked to the sales order with `SOOrderType`, `SOOrderNbr`, and `SOLineNbr`.
4. `PUT /entity/MANUFACTURING/{version}/ProductionOrderDetail?$expand=Operations` with one operation row per work center.

If a later step fails, the screen lists the document numbers already created and tells the estimator to check Acumatica before submitting again.

## Brand

Brand files live in [`public/brand/`](public/brand/):

- `app-background.png` — full-page background (1024×576). It includes the official logo, the tagline “Quality Built. Rail Ready.”, and the railroad tracks. Wide screens use it full-page (`cover`, anchored to the left so the logo stays in frame, `fixed`). Screens under 900px use a plain gray gradient so the form stays usable, and show `logo.svg` instead of the background logo.
- `logo.svg` — wordmark used on small screens, where the background image is not shown
- `mark.svg` — compact QTE mark

Colors are navy `#0B1F4B` and royal blue `#1F4FD1` on white. Replace `public/brand/app-background.png` to change the page background, and `public/brand/logo.svg` to change the small-screen wordmark.

## Extend the quote

New fields and steps are data, not one-off form code.

**Add a field**

1. Add an entry to `FIELDS` in [`src/domain/fields.ts`](src/domain/fields.ts). Set `stage`, `section`, `label`, `type`, `required`, and the spreadsheet `help` text. Use `copiedFrom` when a later stage should inherit it, and `defaultValue` for a QTE default.
2. If it is a new group, add a section to `SECTIONS`. The wizard renders it on its own.
3. Map it to Acumatica in [`src/domain/mapping.ts`](src/domain/mapping.ts). Standard fields go on the entity. Values that are not standard Acumatica fields go in the note, and optionally in [`config/custom-fields.json`](config/custom-fields.json).
4. Add an assertion in [`src/domain/mapping.test.ts`](src/domain/mapping.test.ts).

The review screen lists every field in the catalog, so a new field shows up there without a separate layout.

**Add an operation**

Add a row to [`data/operations.json`](data/operations.json). Keep `operationId` and `workCenter` as strings so leading zeros survive (`"010"`, not `10`). Create the matching work center in Acumatica.

**Add a step**

1. Add the stage to the `Stage` union in [`src/domain/types.ts`](src/domain/types.ts) and to the draft.
2. Add the step to [`src/domain/steps.ts`](src/domain/steps.ts).
3. A step that is only fields is rendered by the existing stage form. A step with its own interaction (like operations) gets a component, the way [`src/components/OperationEditor.tsx`](src/components/OperationEditor.tsx) does.

**Change an endpoint version**

Set the env vars. Field names that differ between versions are isolated in `src/server/acumatica/client.ts` and `src/domain/mapping.ts`.

## Tests

```bash
npm test
```

Covers:

- Hours ÷ 8, run time fixed at 8:00 / 480 minutes, and rejection of zero or negative hours
- Every workbook field, the QTE defaults, and copy-forward (including Due Date, which is copied from Required Delivery Date)
- MS order type, account codes `1215` and `5910`, operation IDs kept as strings, and run units on the manufacturing payload
- The session cookie round-trip, and that a password is not part of the session

## Contributing

1. Open an issue or a pull request against `main`. Bug reports should name the step, the tenant (production or test), and the Acumatica message if there is one.
2. Branch from `main`. Do not commit `.env`, `.env.local`, passwords, or session secrets.
3. Keep estimator-facing language plain. Put workbook notes in the field `help` text.
4. Add or update a test when you change the hours conversion or the Acumatica mapping.
5. Run `npm test` and `npm run build` before asking for review.
6. Contributions are accepted under the MIT license.

## Project map

```
data/operations.json          Operation ID, work center, description
data/demo-lookups.json        Demo customers, inventory, terms
config/custom-fields.json     Optional Usr* bindings
src/domain/fields.ts          Field catalog (labels, required, defaults, copy-forward)
src/domain/mapping.ts         Draft → Acumatica payloads
src/domain/run-time.ts        Hours → run units and 8:00
src/server/acumatica/         Login, lookups, create quote / order / production order
src/app/api/                  Session, lookups, submit
src/components/               Sign-in and the wizard
public/brand/                 Logo and background
```
