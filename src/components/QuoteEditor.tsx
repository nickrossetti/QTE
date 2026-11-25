"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { displayField } from "@/domain/display";
import { carryForward, restoreCopied, withField, withOperations } from "@/domain/draft";
import { fieldByKey } from "@/domain/fields";
import { JOB_SECTIONS, JOB_TYPES } from "@/domain/job-form";
import { formatRunUnits } from "@/domain/format";
import { estimatedHoursToRun } from "@/domain/run-time";
import type { Draft, Stage, SubmitResult } from "@/domain/types";
import { errorMap, validateAll, validateOperations, validateStage } from "@/domain/validation";
import { copyQuote, getQuote, upsertQuote, type SavedQuote } from "@/lib/quotes-store";
import { FieldControl } from "./FieldControl";
import { OperationEditor } from "./OperationEditor";
import { WizardProvider } from "./wizard-context";

const TABS = [
  { id: "job", label: "Job details" },
  { id: "operations", label: "Operations" },
  { id: "summary", label: "Summary" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export function QuoteEditor({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<SavedQuote | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("job");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [mode, setMode] = useState<"demo" | "live">("demo");

  useEffect(() => {
    setQuote(getQuote(id));
    fetch("/api/auth/session")
      .then(async (response) => (response.ok ? response.json() : null))
      .then((info: { mode?: "demo" | "live" } | null) => {
        if (info?.mode === "live") setMode("live");
      })
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!quote) return;
    upsertQuote(quote);
    setSavedAt("Saved on this device");
  }, [quote]);

  const draft = quote?.draft ?? null;
  const api = useMemo(() => {
    if (!draft) return null;
    return {
      draft,
      errors,
      updateField: (stage: Stage, key: string, value: string, extras?: Record<string, string>) => {
        setQuote((current) =>
          current
            ? { ...current, updatedAt: new Date().toISOString(), draft: withField(current.draft, stage, key, value, extras) }
            : current,
        );
        setErrors((current) => {
          const next = { ...current };
          delete next[`${stage}.${key}`];
          return next;
        });
      },
      restore: (stage: Stage, key: string) => {
        setQuote((current) =>
          current ? { ...current, updatedAt: new Date().toISOString(), draft: restoreCopied(current.draft, stage, key) } : current,
        );
      },
      setOperations: (operations: Draft["operations"]) => {
        setQuote((current) =>
          current
            ? { ...current, updatedAt: new Date().toISOString(), draft: withOperations(carryForward(current.draft), operations) }
            : current,
        );
      },
    };
  }, [draft, errors]);

  if (quote === undefined) return <p className="muted">Loading quote…</p>;
  if (!quote || !api) {
    return (
      <div className="card">
        <p>That quote is not on this device.</p>
        <Link href="/" className="q-btn">
          All quotes
        </Link>
      </div>
    );
  }

  const type = quote.draft.productionOrder.orderType;
  const typeLabel = JOB_TYPES.find((item) => item.value === type)?.title || "Choose a type";

  function goOperations() {
    const found = [
      ...validateStage(quote!.draft, "quote"),
      ...validateStage(quote!.draft, "salesOrder"),
      ...validateStage(quote!.draft, "productionOrder"),
    ];
    if (found.length) {
      setErrors(errorMap(found));
      const more = JOB_SECTIONS.find((section) => section.more);
      if (more?.fields.some((field) => found.some((error) => error.stage === field.stage && error.key === field.key))) {
        setMoreOpen(true);
      }
      const first = found[0];
      document.getElementById(`${first.stage}-${first.key}`)?.focus();
      setTab("job");
      return;
    }
    setErrors({});
    setTab("operations");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goSummary() {
    const found = validateOperations(quote!.draft);
    if (found.length) {
      setErrors(errorMap(found));
      setTab("operations");
      return;
    }
    setErrors({});
    setTab("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const found = validateAll(quote!.draft);
    if (found.length) {
      setErrors(errorMap(found));
      setSubmitError(found[0]?.message || "Some required fields are still empty.");
      setTab(found[0]?.stage === "operations" ? "operations" : "job");
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carryForward(quote!.draft)),
      });
      const data = (await response.json()) as SubmitResult & { error?: string };
      if (!response.ok) {
        setSubmitError(data.error || "The quote could not be sent.");
        return;
      }
      setQuote((current) =>
        current ? { ...current, status: "sent", result: data, updatedAt: new Date().toISOString() } : current,
      );
    } catch {
      setSubmitError("We couldn't reach the server. Your quote is still saved on this device.");
    } finally {
      setBusy(false);
    }
  }

  function duplicate() {
    const copy = copyQuote(quote!.id);
    if (copy) router.push(`/quote/${copy.id}`);
  }

  function downloadCsv() {
    const lines = ["Field,Value"];
    for (const section of JOB_SECTIONS) {
      for (const ref of section.fields) {
        const field = fieldByKey(ref.stage, ref.key);
        if (!field) continue;
        const value = displayField(field, quote!.draft[ref.stage]).replaceAll('"', '""');
        lines.push(`"${field.label}","${value}"`);
      }
    }
    for (const line of quote!.draft.operations) {
      const run = Number(line.estimatedHours) > 0 ? estimatedHoursToRun(Number(line.estimatedHours)) : null;
      lines.push(
        `"${line.operationId} ${line.description}","${line.estimatedHours} hrs, run units ${run ? formatRunUnits(run.runUnits) : ""}, run time ${run?.runTime ?? ""}"`,
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${quote!.number}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <WizardProvider value={api}>
      <div>
        <div className="noprint mb-2">
          <Link href="/" className="q-btn q-btn-ghost q-btn-sm">
            ← All quotes
          </Link>
        </div>
        <div className="esthead">
          <h1>{quote.number}</h1>
          <span className={`tag ${quote.status}`}>{quote.status === "sent" ? "Sent" : "Draft"}</span>
          {quote.id === "sample-quote" && <span className="tag sample">Sample</span>}
          <span className="muted">{savedAt}</span>
        </div>
        <p className="muted">
          {typeLabel}
          {quote.draft.quote.customerName ? ` · ${quote.draft.quote.customerName}` : ""}
          {quote.draft.quote.description ? ` · ${quote.draft.quote.description}` : ""}
        </p>
        {quote.id === "sample-quote" && (
          <p className="note red">Sample. Made-up customer and hours so you can see how a quote works. It is not a real job.</p>
        )}
        <div className="kpis">
          <div className="kpi">
            <span>Type</span>
            <b>{type || "—"}</b>
          </div>
          <div className="kpi">
            <span>How many</span>
            <b>{quote.draft.productionOrder.qtyToProduce || "—"}</b>
          </div>
          <div className="kpi">
            <span>Need it by</span>
            <b className="!text-2xl">{quote.draft.quote.requiredDeliveryDate || "—"}</b>
          </div>
          <div className="kpi big">
            <span>Operations</span>
            <b>{quote.draft.operations.length}</b>
          </div>
        </div>
        <div className="tabs noprint" role="tablist">
          {TABS.map((item, index) => (
            <button key={item.id} type="button" className={tab === item.id ? "on" : ""} onClick={() => setTab(item.id)}>
              <span className="step">{index + 1}</span>
              {item.label}
            </button>
          ))}
        </div>

        {tab === "job" && (
          <section className="card">
            <h2>1. Job details</h2>
            <p className="label-strong">Type of job</p>
            <div className="types">
              {JOB_TYPES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`type ${type === item.value ? "on" : ""}`}
                  onClick={() => api.updateField("productionOrder", "orderType", item.value)}
                >
                  <b>{item.title}</b>
                  <span>{item.hint}</span>
                </button>
              ))}
            </div>
            {errors["productionOrder.orderType"] && <p className="err">{errors["productionOrder.orderType"]}</p>}
            {JOB_SECTIONS.filter((section) => !section.more).map((section) => (
              <div key={section.id} className="mt-4">
                <h3>{section.title}</h3>
                <div className="form2">
                  {section.fields.map((ref) => {
                    const field = fieldByKey(ref.stage, ref.key);
                    if (!field) return null;
                    return (
                      <div key={`${ref.stage}.${ref.key}`} className={field.wide || field.type === "textarea" ? "wide" : undefined}>
                        <FieldControl field={field} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <details className="more" open={moreOpen} onToggle={(event) => setMoreOpen((event.target as HTMLDetailsElement).open)}>
              <summary>More details</summary>
              <p className="muted">{JOB_SECTIONS.find((section) => section.more)?.intro}</p>
              <div className="form2">
                {JOB_SECTIONS.find((section) => section.more)?.fields.map((ref) => {
                  const field = fieldByKey(ref.stage, ref.key);
                  if (!field) return null;
                  return (
                    <div key={`${ref.stage}.${ref.key}`} className={field.wide ? "wide" : undefined}>
                      <FieldControl field={field} />
                    </div>
                  );
                })}
              </div>
            </details>
            <div className="mt-4 flex justify-end">
              <button type="button" className="q-btn" onClick={goOperations}>
                Next: Operations →
              </button>
            </div>
          </section>
        )}

        {tab === "operations" && (
          <section className="card">
            <h2>2. Operations</h2>
            <p className="muted">
              Add each work center this job will pass through. Pick the description. The operation ID and work center fill in.
              Hours become run units: hours ÷ 8, and run time stays 8:00.
            </p>
            <OperationEditor />
            {errors["operations.operations"] && <p className="err">{errors["operations.operations"]}</p>}
            <div className="mt-4 flex justify-end">
              <button type="button" className="q-btn" onClick={goSummary}>
                Next: Summary →
              </button>
            </div>
          </section>
        )}

        {tab === "summary" && (
          <section className="card" data-testid="summary">
            <h2>3. Summary</h2>
            <table className="sumtable">
              <tbody>
                <tr>
                  <td>Sales order type</td>
                  <td className="num">MS</td>
                </tr>
                <tr>
                  <td>Job type</td>
                  <td className="num">{typeLabel}</td>
                </tr>
                <tr>
                  <td>Customer</td>
                  <td className="num">{quote.draft.quote.customerName || quote.draft.quote.customerId || "—"}</td>
                </tr>
                <tr>
                  <td>Inventory</td>
                  <td className="num">{quote.draft.quote.inventoryId || "—"}</td>
                </tr>
                <tr>
                  <td>Quantity</td>
                  <td className="num">{quote.draft.productionOrder.qtyToProduce || "—"} {quote.draft.productionOrder.uom}</td>
                </tr>
                <tr>
                  <td>Need it by</td>
                  <td className="num">{quote.draft.quote.requiredDeliveryDate || "—"}</td>
                </tr>
              </tbody>
            </table>
            <h3>Operations</h3>
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Work center</th>
                  <th>Description</th>
                  <th>Hours</th>
                  <th>Run units</th>
                  <th>Run time</th>
                </tr>
              </thead>
              <tbody>
                {quote.draft.operations.map((line) => {
                  const hours = Number(line.estimatedHours);
                  const run = Number.isFinite(hours) && hours > 0 ? estimatedHoursToRun(hours) : null;
                  return (
                    <tr key={line.id}>
                      <td>{line.operationId}</td>
                      <td>{line.workCenter}</td>
                      <td>{line.description}</td>
                      <td>{line.estimatedHours}</td>
                      <td>{run ? formatRunUnits(run.runUnits) : "—"}</td>
                      <td>{run?.runTime ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted">
              Sending creates an MS sales quote, a sales order, and a {type || "production"} production order in Acumatica.
              {mode === "demo" ? " You are in demo mode, so nothing is sent to Acumatica." : " Documents are created on hold."}
            </p>
            {quote.result && (
              <div className="note blue" data-testid="success-screen">
                <p className="ok">
                  Quote {quote.result.quote.orderType} {quote.result.quote.orderNbr} · Sales order {quote.result.salesOrder.orderType}{" "}
                  {quote.result.salesOrder.orderNbr} · Production {quote.result.productionOrder.orderType}{" "}
                  {quote.result.productionOrder.productionNbr}
                </p>
              </div>
            )}
            {submitError && <p className="err">{submitError}</p>}
            <div className="row noprint mt-4">
              <button type="button" className="q-btn" onClick={() => window.print()}>
                Print
              </button>
              <button type="button" className="q-btn q-btn-ghost" onClick={downloadCsv}>
                Download spreadsheet
              </button>
              <span className="spacer" />
              <button type="button" className="q-btn q-btn-go" disabled={busy || quote.status === "sent"} onClick={() => void submit()} data-testid="submit-button">
                {busy ? "Sending…" : mode === "live" ? "Send to Acumatica" : "Submit demo quote"}
              </button>
              <button type="button" className="q-btn q-btn-ghost" onClick={duplicate}>
                Copy to new draft
              </button>
            </div>
          </section>
        )}
      </div>
    </WizardProvider>
  );
}
