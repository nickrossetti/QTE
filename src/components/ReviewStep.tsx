"use client";

import { displayField } from "@/domain/display";
import { fieldsFor, sectionsFor } from "@/domain/fields";
import { formatRunUnits } from "@/domain/format";
import { estimatedHoursToRun } from "@/domain/run-time";
import { STEPS } from "@/domain/steps";
import type { Stage, SubmitResult } from "@/domain/types";
import { Button, Note } from "./ui";
import { useWizard } from "./wizard-context";

export function ReviewStep({
  mode,
  busy,
  error,
  created,
  onEdit,
  onSubmit,
}: {
  mode: "demo" | "live";
  busy: boolean;
  error: string;
  created?: Partial<SubmitResult>;
  onEdit: (step: number) => void;
  onSubmit: () => void;
}) {
  const { draft } = useWizard();
  const stages: Stage[] = ["quote", "salesOrder", "productionOrder"];

  return (
    <div className="flex flex-col gap-5">
      {mode === "demo" ? (
        <Note>Demo mode is on. This submit stays on this server and is not sent to Acumatica.</Note>
      ) : (
        <Note>
          Documents are created on hold. Shipping arrangement, reference numbers, and the machine serial are
          written to the Acumatica note.
        </Note>
      )}
      {stages.map((stage) => {
        const stepIndex = STEPS.findIndex((step) => step.stage === stage);
        return (
          <section key={stage} className="rounded-xl border border-line bg-white">
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="font-display text-2xl font-semibold text-navy">
                {STEPS[stepIndex]?.label}
              </h3>
              <Button type="button" variant="quiet" onClick={() => onEdit(stepIndex)}>
                Edit
              </Button>
            </header>
            <dl className="grid gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-2">
              {sectionsFor(stage).flatMap((section) =>
                fieldsFor(stage)
                  .filter((field) => field.section === section.id)
                  .map((field) => (
                    <div key={`${stage}-${field.key}`}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{field.label}</dt>
                      <dd className="text-base font-semibold text-navy">{displayField(field, draft[stage])}</dd>
                    </div>
                  )),
              )}
            </dl>
          </section>
        );
      })}
      <section className="rounded-xl border border-line bg-white">
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="font-display text-2xl font-semibold text-navy">Operations</h3>
          <Button type="button" variant="quiet" onClick={() => onEdit(3)}>
            Edit
          </Button>
        </header>
        {draft.operations.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-600">No operations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-bold">Operation</th>
                  <th className="px-4 py-2 font-bold">Work center</th>
                  <th className="px-4 py-2 font-bold">Description</th>
                  <th className="px-4 py-2 font-bold">Hours</th>
                  <th className="px-4 py-2 font-bold">Run units</th>
                  <th className="px-4 py-2 font-bold">Run time</th>
                </tr>
              </thead>
              <tbody>
                {draft.operations.map((line) => {
                  const hours = Number(line.estimatedHours);
                  const run = Number.isFinite(hours) && hours > 0 ? estimatedHoursToRun(hours) : null;
                  return (
                    <tr key={line.id} className="border-t border-line">
                      <td className="px-4 py-2 font-semibold text-navy">{line.operationId}</td>
                      <td className="px-4 py-2">{line.workCenter}</td>
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2">{line.estimatedHours || "—"}</td>
                      <td className="px-4 py-2">{run ? formatRunUnits(run.runUnits) : "—"}</td>
                      <td className="px-4 py-2">{run ? run.runTime : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <p className="font-semibold">{error}</p>
          {created?.quote && (
            <p className="mt-2">
              Already created: quote {created.quote.orderType} {created.quote.orderNbr}
              {created.salesOrder ? `, sales order ${created.salesOrder.orderType} ${created.salesOrder.orderNbr}` : ""}
              {created.productionOrder
                ? `, production order ${created.productionOrder.orderType} ${created.productionOrder.productionNbr}`
                : ""}
              . Check Acumatica before submitting again so you do not create a duplicate.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" className="sm:flex-1" disabled={busy || !!created?.quote} onClick={onSubmit} data-testid="submit-button">
          {busy ? "Sending…" : mode === "demo" ? "Submit demo quote" : "Submit to Acumatica"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.print()}>
          Print summary
        </Button>
      </div>
    </div>
  );
}

export function SuccessPanel({
  result,
  onAnother,
}: {
  result: SubmitResult;
  onAnother: () => void;
}) {
  const cards = [
    { label: "Sales quote", value: `${result.quote.orderType} ${result.quote.orderNbr}` },
    {
      label: "Sales order",
      value: `${result.salesOrder.orderType} ${result.salesOrder.orderNbr}`,
      detail:
        result.salesOrder.method === "converted"
          ? "Converted from the quote."
          : "Created as a new document and linked to the quote.",
    },
    {
      label: "Production order",
      value: `${result.productionOrder.orderType} ${result.productionOrder.productionNbr}`,
      detail: `${result.operationCount} operation${result.operationCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <div className="flex flex-col gap-5" data-testid="success-screen">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-royal">
          {result.mode === "demo" ? "Demo quote saved" : "Sent to Acumatica"}
        </p>
        <h2 className="font-display text-4xl font-semibold text-navy">The quote is in.</h2>
        <p className="mt-1 text-slate-600">
          {result.mode === "demo"
            ? "These are sample document numbers. Nothing was sent to Acumatica."
            : "Open these documents in Acumatica to finish anything that still needs a person."}
        </p>
      </div>
      <div className="grid gap-3">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-line bg-mist px-4 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="font-display text-3xl font-semibold text-navy">{card.value}</p>
            {card.detail && <p className="text-sm text-slate-600">{card.detail}</p>}
          </article>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onAnother}>
          Start another quote
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadSummary(result)}
        >
          Download summary
        </Button>
      </div>
    </div>
  );
}

function downloadSummary(result: SubmitResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qte-${result.quote.orderNbr}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
