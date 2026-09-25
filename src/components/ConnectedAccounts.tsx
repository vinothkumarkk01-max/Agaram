"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionary";

type Provider = "email" | "google" | "apple";

/**
 * Lets an already-signed-in member add Google/Apple to their existing
 * account (or remove one), from /account — the counterpart to the
 * Google/Apple sign-IN buttons on /login and /signup (OAuthButtons.tsx,
 * actions/auth.ts). Deliberately a separate, narrower API:
 * linkIdentity()/unlinkIdentity() operate on the CURRENT session's
 * account, so there's no risk of this ever creating a second account —
 * that risk is specific to signInWithOAuth on the sign-in screens (see
 * the comment on signInWithGoogle in actions/auth.ts).
 *
 * unlinkIdentity() additionally requires "Enable Manual Linking" to be
 * turned on in the Supabase dashboard (Authentication → Providers) —
 * without it, Supabase rejects the call outright. If Disconnect always
 * fails with connectedError below, that setting is the first thing to
 * check, not this component.
 *
 * `identities` comes from the server-rendered /account page's own
 * `supabase.auth.getUser()` call (the User object already carries them
 * — no extra fetch needed to show the initial state); this component
 * only calls Supabase itself for the two actions a member can take
 * here, both of which need a browser redirect (link) or an immediate
 * write with no page reload (unlink).
 */
export function ConnectedAccounts({
  t,
  linkedProviders,
}: {
  t: Dictionary;
  linkedProviders: Provider[];
}) {
  const [providers, setProviders] = useState<Provider[]>(linkedProviders);
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState(false);

  async function connect(provider: "google" | "apple") {
    setError(false);
    setPending(provider);
    const supabase = createClient();
    const { data, error: linkError } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account")}` },
    });
    if (linkError || !data?.url) {
      setError(true);
      setPending(null);
      return;
    }
    window.location.assign(data.url);
  }

  async function disconnect(provider: "google" | "apple") {
    if (!window.confirm(t.account.connectedDisconnectConfirm)) return;
    setError(false);
    setPending(provider);
    const supabase = createClient();
    const { data: identitiesData } = await supabase.auth.getUserIdentities();
    const identity = identitiesData?.identities.find((i) => i.provider === provider);
    if (!identity) {
      setPending(null);
      return;
    }
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
    setPending(null);
    if (unlinkError) {
      setError(true);
      return;
    }
    setProviders((prev) => prev.filter((p) => p !== provider));
  }

  const rows: { provider: Provider; label: string }[] = [
    { provider: "email", label: t.account.connectedProviderEmail },
    { provider: "google", label: t.account.connectedProviderGoogle },
    { provider: "apple", label: t.account.connectedProviderApple },
  ];

  return (
    <div className="flex flex-col gap-1">
      {rows.map(({ provider, label }, index) => {
        const isConnected = providers.includes(provider);
        const isOAuth = provider !== "email";
        const isBusy = pending === provider;
        return (
          <div
            key={provider}
            className="flex items-center justify-between gap-3 py-2"
            style={index > 0 ? { borderTop: "1px solid var(--line)" } : undefined}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                {label}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: isConnected ? "var(--ok)" : "var(--text-soft)" }}
              >
                {isConnected ? t.account.connectedBadgeConnected : t.account.connectedBadgeNotConnected}
              </span>
            </div>
            {isOAuth && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => (isConnected ? disconnect(provider) : connect(provider))}
                className="text-xs font-semibold shrink-0 disabled:opacity-60"
                style={{ color: isConnected ? "var(--text-soft)" : "var(--accent-strong)" }}
              >
                {isConnected ? t.account.connectedDisconnectBtn : t.account.connectedConnectBtn}
              </button>
            )}
          </div>
        );
      })}
      {error && (
        <p className="text-xs mt-2" style={{ color: "var(--accent-strong)" }}>
          {t.account.connectedError}
        </p>
      )}
    </div>
  );
}
