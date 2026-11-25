# Example quotes

These walkthroughs use the demo customers already in the app. None of them are real jobs. You can follow them without an Acumatica password. Open **How to use** in the app for the same steps.

A quote stays on this computer until you press **Submit demo quote** or **Send to Acumatica**. Sales orders are type **MS**. Production orders use the type you pick (MN, RM, RC, or RP). Operation IDs keep their leading zeros. Estimated hours become run units (hours ÷ 8) and run time stays 8:00.

## 1. New machine build (MN)

Northline Mining wants a new 48 inch track machine.

1. On Quotes, press **+ New quote**.
2. Choose **Manufacturing**.
3. Customer: search `Northline` and pick Northline Mining Co. Choose Ada Lovelace so her phone and email fill in.
4. Job / machine: `48 inch track machine for the north pit`. Inventory: `QTE-TRK-48`. How many: `1`. Serial: `NL-2601`. Their reference: `LOI-440`.
5. Need it by: a date about three months out. Date the customer accepted: today. Start and end: the shop window before that delivery date.
6. Payment terms: `Net 30`. Shipping: `Customer Pickup`. Address: `100 Quarry Road`, Duluth, MN, `55802`. PO number: `PO-7781`.
7. Leave **More details** closed. Dates, warehouse `1`, location `MAIN`, unit `EA`, estimated costing, user dates, and the WIP accounts are already filled in.
8. **Next: Operations.** Add Mobilization (`000` / work center `00`) for 8 hours, Fabrication - Frame (`020` / `20`) for 40 hours, and Track Test (`090` / `90`) for 8 hours. Run units show 1, 5, and 1. Run time is 8:00 on each.
9. **Next: Summary.** Check the MS sales order type and the MN production order. Press **Print** for a paper copy. In demo mode, **Submit demo quote** returns sample document numbers and does not call Acumatica.

## 2. Remanufacture (RM)

Harbor Aggregate is sending a machine back to be rebuilt.

1. **+ New quote**, then **Remanufacturing**.
2. Customer: `Harbor Aggregate LLC`. Contact: Priya Shah.
3. Description: `Rebuild 60 inch track machine`. Inventory: `QTE-TRK-60`. Quantity: `1`. Serial: the number on the machine they are sending, for example `HA-1188`. Reference: `REBUILD-1188`.
4. Delivery, accepted date, start, and end: the rebuild window they agreed to.
5. Terms: `50% Deposit`. Shipping: `Third Party arranged by QTE`. Ship to their yard. PO number: their order number.
6. Operations for a rebuild are usually fewer than a new build. Add Disassembly (`010` / `10`) for 24 hours, Paint - Large Booth (`050` / `50`) for 16 hours, and Machine Assembly - Hydraulics (`080` / `80`) for 32 hours.
7. Summary shows run units 3, 2, and 4. Submit when the customer has accepted.

## 3. Repair (RP) with only a few operations

Summit Rail needs a short repair, not a full build.

1. **+ New quote**, then **Repair**.
2. Customer: `Summit Rail Services`. Contact: Marcus Bell.
3. Description: `Electrical repair and track test`. Inventory: `QTE-RBD-01` if that is the repair item your shop uses, or the real inventory ID from Acumatica when you are signed in. Quantity: `1`. Serial: `SR-442`. Reference: `WO-442`.
4. Shipping arrangement: `Customer Pickup`. A short address is still required. Terms: `Due on Receipt`. PO number: `WO-442`.
5. Operations: only Electrical Repair (`097` / `97`) for 12 hours and Track Test (`090` / `90`) for 4 hours. Run units are 1.5 and 0.5. Do not add fabrication or paint.
6. On the summary, confirm the production order type is RP and that only those two operations are listed.

## 4. Copy a quote and revise it

Use this when the next machine is almost the same as one you already wrote.

1. Open **Q-00001**, the sample quote, or any quote you have finished.
2. On Summary, press **Copy to new draft**.
3. The new quote has a new number and the status Draft. The description starts with “Copy of”.
4. Change the serial number, the customer reference, the PO number, and the dates. Leave the customer and the operations if they are still right.
5. Add or remove an operation if this machine needs different work. Each operation can only be on the quote once.
6. Submit the copy when it is ready. The original quote is unchanged.

If you are signed in to Acumatica, the same steps send a real MS quote, a sales order, and a production order, all on hold. Sign out to go back to demo data.
