import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { unblockMember } from "@/app/actions/blocks";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";

type BlockedMember = {
  blocked_id: string;
  age: number;
  location: string | null;
  initial: string;
  is_verified: boolean;
  blocked_at: string;
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: blockedData } = await supabase.rpc("get_blocked_members");
  const blocked = (blockedData ?? []) as BlockedMember[];

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(120% 70% at 50% -10%, #FFFFFF 0%, var(--bg) 55%)",
      }}
    >
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-semibold"
            style={{ color: "var(--accent-strong)" }}
          >
            ← Dashboard
          </Link>
          <h1
            className="text-2xl mt-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Your account
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-soft)" }}>
            {user?.email}
          </p>
        </div>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">Download your data</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            Everything Agaram has stored about you — profile, preferences,
            identity verification status, payment history, matches,
            messages, and reports you&rsquo;ve filed — as a single JSON
            file.
          </p>
          <a
            href="/api/account/export"
            className="inline-block rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: "var(--text)",
            }}
          >
            Download my data
          </a>
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-raised)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5">Blocked members</h2>
          {blocked.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>
              You haven&rsquo;t blocked anyone.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {blocked.map((b) => (
                <div
                  key={b.blocked_id}
                  className="rounded-xl p-3.5 flex items-center justify-between gap-3"
                  style={{ background: "var(--bg-sunken)" }}
                >
                  <div className="text-sm">
                    <span className="font-semibold">{b.initial}.</span>{" "}
                    <span style={{ color: "var(--text-soft)" }}>
                      {b.age} years{b.location ? ` · ${b.location}` : ""}
                      {b.is_verified ? " · ✓ verified" : ""}
                    </span>
                  </div>
                  <form action={unblockMember.bind(null, b.blocked_id)}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: "var(--bg-raised)",
                        border: "1px solid var(--line)",
                        color: "var(--text-soft)",
                      }}
                    >
                      Unblock
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className="rounded-2xl p-6"
          style={{ background: "var(--accent-soft)", border: "1px solid var(--line)" }}
        >
          <h2 className="text-base font-bold mb-1.5" style={{ color: "var(--accent-strong)" }}>
            Delete your account
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-soft)" }}>
            Permanent, and immediate. See the checkbox below for exactly
            what this removes.
          </p>
          <DeleteAccountForm email={user?.email ?? ""} />
        </section>

        <p className="text-center text-xs" style={{ color: "var(--text-soft)" }}>
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
