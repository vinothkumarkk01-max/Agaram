"use client";

import { useState } from "react";

type Option = { value: string; label: string };

type Props = {
  name: string;
  options: Option[];
  defaultValue?: string;
};

export function PillGroup({ name, options, defaultValue }: Props) {
  const [selected, setSelected] = useState(defaultValue ?? options[0]?.value ?? "");

  return (
    <div className="flex gap-2.5">
      <input type="hidden" name={name} value={selected} />
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className="flex-1 text-center rounded-xl px-3 py-3 text-sm"
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
