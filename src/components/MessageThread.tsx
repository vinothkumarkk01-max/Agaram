"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
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
}: {
  matchId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
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
            Say hello — you&rsquo;re a mutual match!
          </p>
        )}
        {messages.map((m) => {
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

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--accent-strong)" }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
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
          Send
        </button>
      </form>
    </div>
  );
}
