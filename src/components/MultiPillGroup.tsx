"use client";

import { useState } from "react";

type Option = { value: string; label: string };

type Props = {
  /** Omit when this isn't inside a <form> that submits it directly —
   *  e.g. SignupIntentStep, which reads selections via `onChange`
   *  instead and has no surrounding <form> of its own. */
  name?: string;
  options: Option[];
  defaultValue?: string[];
  /** Notified on every toggle, for a caller that needs the selection
   *  in JS rather than (or in addition to) the hidden form field. */
  onChange?: (values: string[]) => void;
};

/**
 * Like PillGroup, but multi-select: any number of chips can be toggled
 * on at once, including zero — nothing rendered with this is ever
 * required. Submits as a single comma-joined hidden input, matching
 * the same comma-list convention splitList() (src/app/actions/
 * profile.ts) already parses for languages / preferred_locations.
 */
export function MultiPillGroup({ name, options, defaultValue = [], onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  function toggle(value: string) {
    setSelected((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {name && <input type="hidden" name={name} value={selected.join(",")} />}
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={isSelected}
            className="rounded-full px-4 py-2 text-sm"
            style={
              isSelected
                ? {
                    background: "var(--accent-strong)",
                    color: "#fff",
                    fontWeight: 700,
                    border: "1.5px solid transparent",
                  }
                : {
                    background: "var(--bg-raised)",
                    color: "var(--text-soft)",
                    border: "1.5px solid var(--line)",
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
