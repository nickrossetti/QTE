"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "./ui";

export interface SearchOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchSelectProps {
  id: string;
  value: string;
  selectedLabel: string;
  options: SearchOption[];
  placeholder: string;
  loading?: boolean;
  invalid?: boolean;
  emptyText?: string;
  onSearch: (query: string) => void;
  onChange: (option: SearchOption) => void;
}

export function SearchSelect({
  id,
  value,
  selectedLabel,
  options,
  placeholder,
  loading,
  invalid,
  emptyText = "No matches. Try a different search.",
  onSearch,
  onChange,
}: SearchSelectProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [options]);

  function choose(option: SearchOption) {
    onChange(option);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        className={`${inputClass(invalid)} h-12`}
        placeholder={placeholder}
        value={open ? query : selectedLabel || value}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          onSearch("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          onSearch(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && options[active]) {
            event.preventDefault();
            choose(options[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-card"
        >
          {loading && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
          {!loading && options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">{emptyText}</li>}
          {options.map((option, index) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className={`flex w-full flex-col items-start px-3 py-2 text-left ${
                  index === active ? "bg-royal/10" : "hover:bg-mist"
                }`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                <span className="text-base font-semibold text-navy">{option.label}</span>
                {option.hint && <span className="text-sm text-slate-500">{option.hint}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
