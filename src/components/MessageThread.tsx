"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, setMilestone } from "@/app/actions/messages";
import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  MESSAGE_MILESTONES,
  milestoneLabel,
  type MessageMilestone,
} from "@/lib/milestones";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  milestone: MessageMilestone | null;
};

const POLL_MS = 4000;

/**
 * V0 simplification: no Supabase Realtime channel, just a plain
 * poll every few seconds. Good enough for a two-person thread at
 * this scale, and it's one fewer moving part (no channel/subscribe
 * lifecycle to manage) than wiring up realtime — can upgrade later
 * if the polling delay ever actually bothers someone.
 */
export function MessageThread({
  matchId,
  currentUserId,
  initialMessages,
  t,
}: {
  matchId: string;
  currentUserId: string;
  initialMessages: Message[];
  t: Dictionary;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMilestonePending, startMilestoneTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at, milestone")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  const currentMilestone = [...messages]
    .reverse()
    .find((m) => m.milestone)?.milestone;

  function handleSetMilestone(milestone: MessageMilestone) {
    setError(null);
    startMilestoneTransition(async () => {
      const result = await setMilestone(matchId, milestone);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  useEffect(() => {
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError(null);
    startTransition(async () => {
      const result = await sendMessage(matchId, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await refresh();
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pb-3 px-1">
        {messages.length === 0 && (
          <p
            className="text-sm text-center mt-10"
            style={{ color: "var(--text-soft)" }}
          >
            {t.matches.sayHello}
          </p>
        )}
        {messages.map((m) => {
          if (m.milestone) {
            return (
              <div
                key={m.id}
                className="self-center rounded-full px-4 py-1.5 text-xs font-semibold my-1"
                style={{ background: "var(--ok-soft)", color: "var(--ok)" }}
              >
                {milestoneLabel(t, m.milestone)}
              </div>
            );
          }
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                background: mine ? "var(--accent-strong)" : "var(--bg-sunken)",
                color: mine ? "#fff" : "var(--text)",
              }}
            >
              {m.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="mb-2">
        <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-soft)" }}>
          {t.matches.milestoneMarkAs}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MESSAGE_MILESTONES.map((milestone) => {
            const active = milestone === currentMilestone;
            return (
              <button
                key={milestone}
                type="button"
                disabled={isMilestonePending}
                onClick={() => handleSetMilestone(milestone)}
                className="rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60"
                style={
                  active
                    ? { background: "var(--ok-soft)", color: "var(--ok)" }
                    : {
                        background: "var(--bg-sunken)",
                        color: "var(--text-soft)",
                        border: "1px solid var(--line)",
                      }
                }
              >
                {milestoneLabel(t, milestone)}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--accent-strong)" }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.matches.typeMessage}
          maxLength={2000}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm"
          style={{ background: "var(--bg-sunken)", border: "1px solid var(--line)" }}
        />
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-xl px-5 py-2.5 font-bold text-white text-sm disabled:opacity-60"
          style={{
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {t.matches.send}
        </button>
      </form>
    </div>
  );
}
