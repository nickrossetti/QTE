"use client";

import { useMemo, useState } from "react";
import { operations } from "@/domain/catalog";
import { STEP_COPY } from "@/domain/constants";
import { displayField } from "@/domain/display";
import { fieldsFor } from "@/domain/fields";
import { formatRunUnits } from "@/domain/format";
import { estimatedHoursToRun } from "@/domain/run-time";
import type { OperationLine } from "@/domain/types";
import { SearchSelect } from "./SearchSelect";
import { inputClass, Note } from "./ui";
import { useWizard } from "./wizard-context";

export function OperationEditor() {
  const { draft, errors, setOperations } = useWizard();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const lines = draft.operations;

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return operations
      .filter(
        (item) =>
          !needle ||
          item.description.toLowerCase().includes(needle) ||
          item.operationId.includes(needle) ||
          item.workCenter.toLowerCase().includes(needle),
      )
      .slice(0, 12)
      .map((item) => ({
        value: item.operationId,
        label: item.description,
        hint: `Operation ${item.operationId} · Work center ${item.workCenter}`,
      }));
  }, [query]);

  function updateLine(id: string, estimatedHours: string) {
    setOperations(lines.map((line) => (line.id === id ? { ...line, estimatedHours } : line)));
  }

  const totalHours = lines.reduce((sum, line) => sum + (Number(line.estimatedHours) || 0), 0);
  const summaryFields = fieldsFor("productionOrder").filter((field) =>
    ["orderType", "inventoryId", "qtyToProduce", "uom", "warehouse", "machineSerialNumber"].includes(field.key),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-xl bg-mist p-4 sm:grid-cols-2">
        {summaryFields.map((field) => (
          <p key={field.key} className="text-sm text-navy">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">{field.label}</span>
            <span className="font-semibold">{displayField(field, draft.productionOrder)}</span>
          </p>
        ))}
      </div>
      <Note>{STEP_COPY.operations.conversion}</Note>
      <div>
        <label htmlFor="add-operation" className="mb-1.5 block text-base font-semibold text-navy">
          Add an operation
        </label>
        <SearchSelect
          id="add-operation"
          value=""
          selectedLabel=""
          options={options}
          placeholder="Search by description, such as Disassembly"
          emptyText="No operation uses that description."
          onSearch={setQuery}
          onChange={(option) => {
            const match = operations.find((item) => item.operationId === option.value);
            if (!match) return;
            if (lines.some((line) => line.operationId === match.operationId)) {
              setNotice(`${match.description} is already on this order. Each operation can only be added once.`);
              return;
            }
            setNotice("");
            setOperations([
              ...lines,
              {
                id: crypto.randomUUID(),
                operationId: match.operationId,
                workCenter: match.workCenter,
                description: match.description,
                estimatedHours: "",
              },
            ]);
          }}
        />
        <p className="mt-1.5 text-sm text-slate-600">
          The list shows the description. Operation ID and work center fill in automatically.
        </p>
      </div>
      {(notice || errors["operations.operations"]) && (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {notice || errors["operations.operations"]}
        </p>
      )}
      {lines.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-slate-600">
          No operations yet. Add the work centers this machine will pass through.
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {lines.map((line, index) => (
            <OperationCard
              key={line.id}
              line={line}
              index={index}
              total={lines.length}
              error={errors[`operations.${line.id}`]}
              onHours={(hours) => updateLine(line.id, hours)}
              onMove={(direction) => setOperations(move(lines, index, direction))}
              onRemove={() => setOperations(lines.filter((item) => item.id !== line.id))}
            />
          ))}
        </ol>
      )}
      {lines.length > 0 && (
        <p className="text-sm font-semibold text-navy">
          Total estimated hours: {Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(2)}
        </p>
      )}
      <Note>{STEP_COPY.operations.materials}</Note>
    </div>
  );
}

function OperationCard({
  line,
  index,
  total,
  error,
  onHours,
  onMove,
  onRemove,
}: {
  line: OperationLine;
  index: number;
  total: number;
  error?: string;
  onHours: (hours: string) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  const hours = Number(line.estimatedHours);
  const run = Number.isFinite(hours) && hours > 0 ? estimatedHoursToRun(hours) : null;
  return (
    <li className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-royal">Step {index + 1}</p>
          <h3 className="font-display text-2xl font-semibold leading-none text-navy">{line.description}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Operation {line.operationId} · Work center {line.workCenter}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy disabled:opacity-40" disabled={index === 0} onClick={() => onMove(-1)}>
            Up
          </button>
          <button type="button" className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-navy disabled:opacity-40" disabled={index === total - 1} onClick={() => onMove(1)}>
            Down
          </button>
          <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-end">
        <label className="text-sm font-semibold text-navy">
          Estimated hours
          <span className="text-royal"> *</span>
          <input
            className={`${inputClass(!!error)} mt-1 h-12`}
            inputMode="decimal"
            value={line.estimatedHours}
            aria-label={`Estimated hours for ${line.description}`}
            onChange={(event) => onHours(event.target.value)}
          />
        </label>
        <p className="rounded-lg bg-mist px-3 py-3 text-sm text-navy">
          {run ? (
            <>
              Run units <strong>{formatRunUnits(run.runUnits)}</strong>
              <span className="mx-2 text-slate-400">·</span>
              Run time <strong>{run.runTime}</strong>
            </>
          ) : (
            "Enter the total estimated hours for this work center."
          )}
        </p>
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function move(lines: OperationLine[], index: number, direction: -1 | 1): OperationLine[] {
  const next = [...lines];
  const target = index + direction;
  const current = next[index];
  const swap = next[target];
  if (!current || !swap) return lines;
  next[index] = swap;
  next[target] = current;
  return next;
}
