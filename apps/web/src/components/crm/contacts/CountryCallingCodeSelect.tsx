"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { CRM_PHONE_COUNTRIES, filterCountries, type CrmCountryOption } from "@/lib/crm/contact-countries";

const fieldClass =
  "w-full rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2.5 text-sm text-[var(--studio-text-primary)]";

export function CountryCallingCodeSelect({
  iso,
  onChange,
}: {
  iso: string;
  onChange: (country: CrmCountryOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = CRM_PHONE_COUNTRIES.find((c) => c.iso === iso.toUpperCase()) ?? CRM_PHONE_COUNTRIES[0];

  const options = useMemo(() => filterCountries(query), [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative min-w-[11rem]">
      <button
        type="button"
        className={`${fieldClass} flex items-center gap-2 text-left`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span aria-hidden>{selected.flag}</span>
        <span className="truncate">{selected.callingCode}</span>
        <span className="ml-auto text-xs text-[var(--studio-text-tertiary)]">{selected.iso}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-[min(100vw-2rem,18rem)] overflow-hidden rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-lg">
          <div className="p-2">
            <input
              type="search"
              className={`${fieldClass} mb-2`}
              placeholder="Search country"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-48 overflow-y-auto" role="listbox">
            {options.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.iso === selected.iso}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--studio-bg-hover)]"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span>{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-[var(--studio-text-tertiary)]">{c.callingCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}