import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

type ProgressState = "done" | "active" | "upcoming";

type Props = {
  // Omit stepChip/progress entirely for a screen that isn't part of
  // the linear onboarding sequence (e.g. editing an already-complete
  // profile from the dashboard) — showing "Day 1 · Step 2 of 3" and a
  // progress bar to someone who finished onboarding weeks ago is both
  // confusing copy and, per customer feedback (Sept 2026), extra
  // vertical height this screen doesn't need.
  stepChip?: string;
  progress?: ProgressState[];
  backHref: string;
  backLabel: string;
  brand: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: ReactNode;
  colWidth?: number;
};

export function OnboardingShell({
  stepChip,
  progress,
  backHref,
  backLabel,
  brand,
  eyebrow,
  title,
  lede,
  children,
  colWidth = 600,
}: Props) {
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="flex items-center justify-between px-6 sm:px-16 pt-8">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            {brand}
          </span>
        </div>
        {stepChip && (
          <div
            className="text-xs rounded-full px-3.5 py-1.5 shadow-sm"
            style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}
          >
            {stepChip}
          </div>
        )}
      </div>

      {progress && (
        <div className="px-6 sm:px-16 pt-5">
          <div
            className="flex gap-2 mx-auto"
            style={{ maxWidth: colWidth }}
          >
            {progress.map((state, i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full"
                style={{
                  background:
                    state === "upcoming" ? "var(--line)" : "var(--accent-strong)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex justify-center px-6 sm:px-16 py-6">
        <div className="w-full" style={{ maxWidth: colWidth }}>
          <Link
            href={backHref}
            className="text-xs font-semibold inline-flex items-center gap-1.5 mb-4"
            style={{ color: "var(--text-soft)" }}
          >
            {backLabel}
          </Link>
          <div
            className="text-xs uppercase tracking-wider font-semibold mb-2.5"
            style={{ color: "var(--accent-strong)" }}
          >
            {eyebrow}
          </div>
          <h1
            className="text-2xl mb-2"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {title}
          </h1>
          <p
            className="text-sm leading-relaxed mb-5"
            style={{ color: "var(--text-soft)" }}
          >
            {lede}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}
