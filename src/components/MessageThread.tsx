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

// A slow safety-net poll alongside the Realtime subscription below —
// if a socket ever silently drops, the thread still catches up within
// this window instead of going stale indefinitely. Realtime is the
// primary path now; this is just a backstop, which is why it's so
// much slower than the old V0 poll (4s) it replaces.
const FALLBACK_POLL_MS = 15000;

// How long "Typing…" stays visible after the last broadcast event
// with no follow-up — there's no explicit "stopped typing" event,
// just this client-side expiry, so a dropped last keystroke can never
// leave the indicator stuck on.
const TYPING_EXPIRY_MS = 3000;
// How often a single person's own typing broadcasts are sent, at
// most — keeps a fast typist from flooding the channel with an event
// per keystroke.
const TYPING_SEND_THROTTLE_MS = 1500;

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
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAt = useRef(0);
  // One Supabase client (and, below, one Realtime channel) for this
  // component's whole lifetime, not a fresh one per call — broadcast
  // sends need to go out over the SAME joined channel the listener
  // below subscribes on, or a peer's "typing" event has nowhere
  // reliable to land. useState's lazy initializer (not a ref) is what
  // creates it exactly once without touching a ref during render.
  const [supabase] = useState(() => createClient());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function refresh() {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, created_at, milestone")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }

  async function refreshReadState() {
    const { data } = await supabase
      .from("message_read_state")
      .select("profile_id, last_read_at")
      .eq("match_id", matchId);
    const theirs = data?.find((r) => r.profile_id !== currentUserId);
    setOtherLastReadAt(theirs?.last_read_at ?? null);
  }

  async function markRead() {
    await supabase
      .from("message_read_state")
      .upsert(
        { match_id: matchId, profile_id: currentUserId, last_read_at: new Date().toISOString() },
        { onConflict: "match_id,profile_id" }
      );
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

  // Realtime: one channel per match, carrying three independent
  // things — new messages, the other person's read-state row, and
  // ephemeral typing broadcasts (never persisted anywhere). Postgres
  // Changes only delivers rows this session's own RLS policies would
  // already let it read (see supabase/schema.sql, Phase 13), so this
  // is the same access as the plain reads above, just pushed instead
  // of polled.
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_state",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          refreshReadState();
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.userId === currentUserId) return; // ignore our own broadcasts
        setIsOtherTyping(true);
        if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
        typingHideTimer.current = setTimeout(() => setIsOtherTyping(false), TYPING_EXPIRY_MS);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (typingHideTimer.current) clearTimeout(typingHideTimer.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, currentUserId]);

  useEffect(() => {
    const tick = () => {
      refresh();
      refreshReadState();
    };
    // Deferred via setTimeout rather than called directly — same
    // "subscribe to an external callback" shape as the setInterval
    // below, just firing once immediately instead of every
    // FALLBACK_POLL_MS.
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, FALLBACK_POLL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Viewing the thread (initial load, or any new message arriving
  // while it's open) counts as reading it.
  useEffect(() => {
    markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function broadcastTyping() {
    if (!channelRef.current) return; // channel not joined yet — skip rather than open a second one
    const now = Date.now();
    if (now - lastTypingSentAt.current < TYPING_SEND_THROTTLE_MS) return;
    lastTypingSentAt.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }

  function handleTextChange(value: string) {
    setText(value);
    if (value.trim()) broadcastTyping();
  }

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

  const lastMessage = messages[messages.length - 1];
  const showSeen =
    !!lastMessage &&
    !lastMessage.milestone &&
    lastMessage.sender_id === currentUserId &&
    !!otherLastReadAt &&
    new Date(otherLastReadAt) >= new Date(lastMessage.created_at);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {currentMilestone && (
        <div
          className="text-xs font-semibold mb-2 shrink-0"
          style={{ color: "var(--ok)" }}
        >
          {t.matches.milestoneCurrentPrefix}
          {milestoneLabel(t, currentMilestone)}
        </div>
      )}
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
        {showSeen && (
          <div
            className="self-end text-[11px] font-semibold pr-1"
            style={{ color: "var(--text-soft)" }}
          >
            {t.matches.seen}
          </div>
        )}
        {isOtherTyping && (
          <div
            className="self-start rounded-2xl px-4 py-2.5 text-sm italic"
            style={{ background: "var(--bg-sunken)", color: "var(--text-soft)" }}
          >
            {t.matches.typingIndicator}
          </div>
        )}
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
          onChange={(e) => handleTextChange(e.target.value)}
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
