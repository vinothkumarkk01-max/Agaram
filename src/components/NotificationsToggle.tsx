"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/actions/push";
import type { Dictionary } from "@/lib/i18n/dictionary";

// PushManager's applicationServerKey wants a BufferSource, not the
// base64url string VAPID keys are normally handed around as. Typed as
// BufferSource (rather than Uint8Array) at the return, since newer
// TS DOM lib types Uint8Array's backing buffer as ArrayBufferLike
// (which includes SharedArrayBuffer) and applicationServerKey wants
// specifically ArrayBufferView<ArrayBuffer> — the runtime value is
// always a plain, non-shared ArrayBuffer either way.
function urlBase64ToUint8Array(base64: string): BufferSource {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type Status = "unsupported" | "unconfigured" | "off" | "on" | "denied";

export function NotificationsToggle({ t }: { t: Dictionary }) {
  const [status, setStatus] = useState<Status>("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    // Deferred via setTimeout, same as the equivalent fix in
    // MessageThread.tsx — react-hooks/set-state-in-effect flags a
    // setState call that's the direct first statement of an effect
    // body, even a synchronous feature-detection branch like the
    // first two below. Wrapping the whole decision in a callback
    // scheduled from the effect (rather than run directly inside it)
    // is the accepted pattern this codebase already uses.
    const determineStatus = () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (!vapidPublicKey) {
        setStatus("unconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      navigator.serviceWorker.getRegistration("/sw.js").then((registration) => {
        registration?.pushManager.getSubscription().then((sub) => {
          setStatus(sub ? "on" : "off");
        });
      });
    };
    const timer = setTimeout(determineStatus, 0);
    return () => clearTimeout(timer);
  }, [vapidPublicKey]);

  async function handleEnable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setStatus("on");
    } catch {
      setError(t.account.notificationsError);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError(t.account.notificationsError);
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || status === "unconfigured") {
    return null; // Nothing useful to offer — don't show a dead toggle.
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--text-soft)" }}>
          {status === "on"
            ? t.account.notificationsOn
            : status === "denied"
              ? t.account.notificationsDenied
              : t.account.notificationsOff}
        </p>
        {status !== "denied" && (
          <button
            type="button"
            onClick={status === "on" ? handleDisable : handleEnable}
            disabled={busy}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            {status === "on" ? t.account.notificationsTurnOff : t.account.notificationsTurnOn}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-strong)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
