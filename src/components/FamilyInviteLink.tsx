"use client";

import { useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Props = {
  url: string;
  t: Dictionary;
};

/** A read-only, click-to-copy invite link. Needs to be a Client
 *  Component only for the clipboard call — everything else about the
 *  family-sharing section around it stays server-rendered. */
export function FamilyInviteLink({ url, t }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, non-secure
      // context) — the input below is still selectable by hand.
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-xs outline-none"
        style={{
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: "var(--text-soft)",
        }}
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-xl px-3.5 py-2.5 text-xs font-bold"
        style={{
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: "var(--text)",
        }}
      >
        {copied ? t.family.linkCopied : t.family.copyLink}
      </button>
    </div>
  );
}
