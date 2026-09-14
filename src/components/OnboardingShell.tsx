import Link from "next/link";
import type { ReactNode } from "react";

type ProgressState = "done" | "active" | "upcoming";

type Props = {
  stepChip: string;
  progress: ProgressState[];
  backHref: string;
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
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-strong))",
            }}
          >
            அ
          </div>
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: "var(--text-soft)" }}
          >
            Agaram Premium
          </span>
        </div>
        <div
          className="text-xs rounded-full px-3.5 py-1.5 shadow-sm"
          style={{ background: "var(--bg-raised)", color: "var(--text-soft)" }}
        >
          {stepChip}
        </div>
      </div>

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

      <div className="flex-1 flex justify-center px-6 sm:px-16 py-6">
        <div className="w-full" style={{ maxWidth: colWidth }}>
          <Link
            href={backHref}
            className="text-xs font-semibold inline-flex items-center gap-1.5 mb-4"
            style={{ color: "var(--text-soft)" }}
          >
            &larr; Back
          </Link>
          <div
            className="text-xs uppercase tracking-wider font-semibold mb-2.5"
            style={{ color: "var(--accent-strong)" }}
          >
            {eyebrow}
          </div>
          <h1
            className="text-3xl mb-2.5"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            {title}
          </h1>
          <p
            className="text-sm leading-relaxed mb-7"
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
