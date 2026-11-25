import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function HowToPage() {
  return (
    <Shell>
      <h1>How to use</h1>
      <p className="muted">
        Four short examples with the demo customers. Nothing here is a real job. The same steps are in{" "}
        <code>docs/EXAMPLES.md</code> for people who work on the app.
      </p>
      <article className="card">
        <h2>1. New machine (MN)</h2>
        <ol className="steps">
          <li>Press <strong>+ New quote</strong> and choose <strong>Manufacturing</strong>.</li>
          <li>Customer: Northline Mining Co. Pick Ada Lovelace so her phone and email fill in.</li>
          <li>Describe the machine, choose inventory <strong>QTE-TRK-48</strong>, quantity 1, and type the serial and their reference number.</li>
          <li>Enter the delivery date, the day they accepted, and the shop start and end dates.</li>
          <li>Choose payment terms, how it will ship, the ship-to address, and the PO number.</li>
          <li>Leave <strong>More details</strong> closed unless warehouse, costing, or the WIP accounts should change.</li>
          <li>On Operations, add Mobilization, Fabrication - Frame, and Track Test. Type the hours. Run units are hours ÷ 8 and run time stays 8:00.</li>
          <li>On Summary, press <strong>Print</strong>, then submit. Demo mode does not call Acumatica. A signed-in user creates an MS quote, a sales order, and an MN production order on hold.</li>
        </ol>
      </article>
      <article className="card">
        <h2>2. Remanufacture (RM)</h2>
        <ol className="steps">
          <li>New quote, then <strong>Remanufacturing</strong>.</li>
          <li>Customer: Harbor Aggregate LLC, contact Priya Shah.</li>
          <li>Description: rebuild of their 60 inch machine. Inventory <strong>QTE-TRK-60</strong>. Use the serial of the machine they are sending back.</li>
          <li>Operations are usually shorter than a new build: Disassembly, Paint - Large Booth, and Machine Assembly - Hydraulics.</li>
          <li>Check run units on the summary (24 hours is 3, 16 hours is 2, 32 hours is 4) and submit when they have accepted.</li>
        </ol>
      </article>
      <article className="card">
        <h2>3. Repair (RP)</h2>
        <ol className="steps">
          <li>New quote, then <strong>Repair</strong>.</li>
          <li>Customer: Summit Rail Services, contact Marcus Bell.</li>
          <li>A repair still needs an inventory ID, a serial, terms, a ship-to address, and a PO or work-order number.</li>
          <li>Add only the work you will do. For a short electrical repair: Electrical Repair for 12 hours and Track Test for 4 hours. Do not add fabrication or paint.</li>
          <li>Summary should show production type RP and those two operations only.</li>
        </ol>
      </article>
      <article className="card">
        <h2>4. Copy a quote</h2>
        <ol className="steps">
          <li>Open the sample quote, or any quote you already saved.</li>
          <li>On Summary, press <strong>Copy to new draft</strong>.</li>
          <li>Change the serial, the reference, the PO number, and the dates. Add or remove an operation if this machine is different.</li>
          <li>The original quote stays as it was.</li>
        </ol>
        <p>
          <Link href="/" className="q-btn">
            Back to quotes
          </Link>
        </p>
      </article>
    </Shell>
  );
}
