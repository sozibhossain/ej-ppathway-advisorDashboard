"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string };

/**
 * Searchable single-select combobox (shadcn-style: trigger + popover + search +
 * check marks + empty state). Dependency-free so it works across the patched
 * Next setup. Set `allowCustom` to also accept a typed value not in the list.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled = false,
  allowCustom = false,
  maxResults = 100,
  triggerClassName = "",
  id,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxResults?: number;
  triggerClassName?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? (allowCustom && value ? value : "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return list.slice(0, maxResults);
  }, [options, query, maxResults]);

  const showCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const total = filtered.length + (showCustom ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(total - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showCustom && active === filtered.length) choose(query.trim());
      else if (filtered[active]) choose(filtered[active].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          triggerClassName ||
          "h-11 px-3 bg-[#e6f2f6]/60 border-transparent hover:border-slate-300 focus:border-[#0a7a90] focus:bg-white focus:outline-none"
        }`}
      >
        <span className={display ? "text-slate-900 truncate" : "text-slate-500 truncate"}>
          {display || placeholder}
        </span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center border-b border-slate-100 px-2">
            <SearchIcon />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-9 w-full bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && !showCustom ? (
              <div className="px-2 py-4 text-center text-sm text-slate-400">
                {emptyText}
              </div>
            ) : (
              filtered.map((o, i) => (
                <button
                  type="button"
                  key={o.value}
                  data-idx={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    i === active ? "bg-[#e6f2f6]" : ""
                  }`}
                >
                  <span className="w-4 shrink-0">
                    {o.value === value ? <CheckIcon /> : null}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              ))
            )}
            {showCustom && (
              <button
                type="button"
                data-idx={filtered.length}
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => choose(query.trim())}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  active === filtered.length ? "bg-[#e6f2f6]" : ""
                }`}
              >
                <span className="w-4 shrink-0" />
                <span className="truncate">
                  Use “<span className="font-medium">{query.trim()}</span>”
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-500" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-[#0a7a90]" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
