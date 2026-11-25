"use client";

import { useEffect, useMemo, useState } from "react";
import { STEP_COPY } from "@/domain/constants";
import { DRAFT_STORAGE_KEY, carryForward, emptyDraft, isDraft, restoreCopied, withField, withOperations } from "@/domain/draft";
import { fieldsFor, sectionsFor } from "@/domain/fields";
import { STEPS } from "@/domain/steps";
import type { Draft, Stage, SubmitResult } from "@/domain/types";
import { errorMap, validateOperations, validateStage } from "@/domain/validation";
import { getJson } from "@/lib/api";
import { AppHeader } from "./AppHeader";
import { FieldControl } from "./FieldControl";
import { OperationEditor } from "./OperationEditor";
import { ReviewStep, SuccessPanel } from "./ReviewStep";
import { Button } from "./ui";
import { WizardProvider } from "./wizard-context";

interface SessionInfo {
  mode: "demo" | "live";
  username: string;
  tenant: string;
}

const STEP_KEY = "qte.step.v1";

export function QuoteWizard() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState<Partial<SubmitResult> | undefined>();
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let cancel = false;
    getJson<SessionInfo>("/api/auth/session")
      .then((info) => {
        if (cancel) return;
        setSession(info);
        const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as unknown;
            if (isDraft(parsed)) {
              setDraft(carryForward(parsed));
              const savedStep = Number(sessionStorage.getItem(STEP_KEY));
              if (savedStep >= 0 && savedStep < STEPS.length) setStep(savedStep);
              return;
            }
          } catch {
            // Start a fresh quote if the saved copy is unreadable.
          }
        }
        setDraft(emptyDraft());
      })
      .catch(() => {
        if (!cancel) window.location.href = "/";
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (draft) sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (draft) sessionStorage.setItem(STEP_KEY, String(step));
  }, [draft, step]);

  const api = useMemo(() => {
    if (!draft) return null;
    return {
      draft,
      errors,
      updateField: (stage: Stage, key: string, value: string, extras?: Record<string, string>) => {
        setDraft((current) => (current ? withField(current, stage, key, value, extras) : current));
        setErrors((current) => {
          const next = { ...current };
          delete next[`${stage}.${key}`];
          return next;
        });
      },
      restore: (stage: Stage, key: string) => {
        setDraft((current) => (current ? restoreCopied(current, stage, key) : current));
      },
      setOperations: (operations: Draft["operations"]) => {
        setDraft((current) => (current ? withOperations(current, operations) : current));
        setErrors((current) => {
          const next = { ...current };
          for (const key of Object.keys(next)) {
            if (key.startsWith("operations.")) delete next[key];
          }
          return next;
        });
      },
    };
  }, [draft, errors]);

  function goNext() {
    if (!draft) return;
    const current = STEPS[step];
    if (current.stage === "operations") {
      const found = validateOperations(draft);
      if (found.length) {
        setErrors(errorMap(found));
        return;
      }
    } else if (current.stage === "quote" || current.stage === "salesOrder" || current.stage === "productionOrder") {
      const found = validateStage(draft, current.stage);
      if (found.length) {
        setErrors(errorMap(found));
        document.getElementById(`${current.stage}-${found[0].key}`)?.focus();
        return;
      }
    }
    setErrors({});
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!draft || !session) return;
    setBusy(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as SubmitResult & {
        error?: string;
        created?: Partial<SubmitResult>;
      };
      if (response.status === 401) {
        window.location.href = "/?expired=1";
        return;
      }
      if (!response.ok) {
        setSubmitError(data.error || "The quote could not be submitted.");
        if (data.created) setCreated(data.created);
        return;
      }
      setResult(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(STEP_KEY);
    void fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      window.location.href = "/";
    });
  }

  function startAnother() {
    setDraft(emptyDraft());
    setStep(0);
    setResult(null);
    setErrors({});
    setSubmitError("");
    setCreated(undefined);
    setConfirmClear(false);
  }

  if (!session || !draft || !api) {
    return (
      <main className="qte-app-bg grid place-items-center text-navy">
        <p className="text-lg font-semibold">Loading your quote…</p>
      </main>
    );
  }

  const current = STEPS[step];
  const copy =
    current.stage === "quote" || current.stage === "salesOrder" || current.stage === "productionOrder"
      ? STEP_COPY[current.stage]
      : current.stage === "operations"
        ? STEP_COPY.operations
        : STEP_COPY.review;

  return (
    <WizardProvider value={api}>
      <div className="qte-app-bg text-navy">
        <AppHeader username={session.username} tenant={session.tenant} mode={session.mode} onSignOut={signOut} />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-28 pt-2 min-[900px]:pt-[42vh]">
          <p className="text-sm font-semibold text-navy">
            Step {step + 1} of {STEPS.length}
            <span className="sr-only">. Saved on this device.</span>
          </p>
          <ol className="flex gap-2 overflow-x-auto pb-1" data-testid="wizard-steps">
            {STEPS.map((item, index) => {
              const state = index === step ? "current" : index < step ? "done" : "upcoming";
              return (
                <li key={item.id} className="min-w-[7.5rem] flex-1">
                  <button
                    type="button"
                    disabled={index > step}
                    aria-current={index === step ? "step" : undefined}
                    onClick={() => index < step && setStep(index)}
                    className={`flex h-full w-full flex-col rounded-xl border px-3 py-2 text-left ${
                      state === "current"
                        ? "border-royal bg-white shadow-sm"
                        : state === "done"
                          ? "border-royal/30 bg-white"
                          : "border-transparent bg-white/60 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide text-royal">{index + 1}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-navy/5 sm:p-6" data-testid="wizard-step">
            {result ? (
              <SuccessPanel result={result} onAnother={startAnother} />
            ) : (
              <>
                <h1 className="font-display text-4xl font-semibold leading-none text-navy">{copy.title}</h1>
                <p className="mt-2 max-w-3xl text-base text-slate-600">{copy.intro}</p>
                <p className="mt-2 text-sm text-slate-500">
                  <span className="text-royal">*</span> Required
                </p>
                <form
                  className="mt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (step < STEPS.length - 1) goNext();
                  }}
                >
                  {current.stage === "quote" || current.stage === "salesOrder" || current.stage === "productionOrder" ? (
                    <StageFields stage={current.stage} />
                  ) : current.stage === "operations" ? (
                    <OperationEditor />
                  ) : (
                    <ReviewStep
                      mode={session.mode}
                      busy={busy}
                      error={submitError}
                      created={created}
                      onEdit={setStep}
                      onSubmit={() => void submit()}
                    />
                  )}
                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      {step > 0 && (
                        <Button type="button" variant="secondary" data-testid="back-button" onClick={() => setStep((value) => value - 1)}>
                          Back
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() => {
                          if (!confirmClear) {
                            setConfirmClear(true);
                            return;
                          }
                          startAnother();
                        }}
                      >
                        {confirmClear ? "Click again to clear this quote" : "Start over"}
                      </Button>
                    </div>
                    {step < STEPS.length - 1 && (
                      <Button type="submit" className="sm:min-w-40" data-testid="continue-button">
                        Continue
                      </Button>
                    )}
                  </div>
                </form>
              </>
            )}
          </section>
        </main>
      </div>
    </WizardProvider>
  );
}

function StageFields({ stage }: { stage: Stage }) {
  const sections = sectionsFor(stage);
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <fieldset key={section.id} className="flex flex-col gap-4">
          <legend className="font-display text-2xl font-semibold text-navy">{section.title}</legend>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {fieldsFor(stage)
              .filter((field) => field.section === section.id)
              .map((field) => (
                <div key={field.key} className={field.wide ? "md:col-span-2" : undefined}>
                  <FieldControl field={field} />
                </div>
              ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
