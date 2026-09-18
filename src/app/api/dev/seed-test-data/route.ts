import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dev-only utility: creates a small, fixed set of test accounts so
 * testing doesn't require real people signing up with real email
 * addresses. Off by default — this route does nothing at all unless
 * DEV_SEED_SECRET is set as an environment variable, and even then
 * only responds to a request carrying the exact same secret. Until
 * you set that variable, visiting this URL just gets a 404.
 *
 * This uses the Supabase Admin API (the same service-role client as
 * account deletion, src/lib/supabase/admin.ts) to create real
 * `auth.users` rows with `email_confirm: true`, so there's no
 * confirmation email to click — you can log in immediately. It never
 * touches real member data; it only ever creates or updates the five
 * fixed test accounts below (safe to call more than once — it
 * updates them in place rather than duplicating anything).
 *
 * IMPORTANT — this is a testing convenience, not something to leave
 * reachable once real members are signing up. Keep DEV_SEED_SECRET
 * private, and remove this route (or the env var) before you'd be
 * uncomfortable with anyone who guessed the secret being able to
 * (re)create these fake profiles on your live database.
 */

export const dynamic = "force-dynamic";

const TEST_PASSWORD = "AgaramTest#2026";
const ONE_YEAR_FROM_NOW = new Date(
  Date.now() + 365 * 24 * 60 * 60 * 1000
).toISOString();

// Matches the `matches_pair_order` check constraint in schema.sql —
// duplicated here the same way it's already duplicated between
// actions/matches.ts and actions/blocks.ts, rather than importing a
// "use server" action file into a route handler.
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

type SeedProfile = {
  full_name: string;
  profile_type: "bride" | "groom";
  age: number;
  location: string;
  about_me: string;
};

type SeedAccount = {
  email: string;
  label: string;
  profile: SeedProfile | null;
};

const ACCOUNTS: SeedAccount[] = [
  {
    email: "bride.a@agaram-test.dev",
    label:
      "Test Bride A — already a mutual match with Test Groom A, Elite, identity verified. Use this pair to test messaging, milestone tagging, and family sharing right away.",
    profile: {
      full_name: "Test Bride A",
      profile_type: "bride",
      age: 28,
      location: "Chennai",
      about_me: "Seeded test profile — safe to ignore or delete.",
    },
  },
  {
    email: "groom.a@agaram-test.dev",
    label: "Test Groom A — paired with Test Bride A (see above).",
    profile: {
      full_name: "Test Groom A",
      profile_type: "groom",
      age: 31,
      location: "Chennai",
      about_me: "Seeded test profile — safe to ignore or delete.",
    },
  },
  {
    email: "bride.b@agaram-test.dev",
    label:
      "Test Bride B — Elite, identity verified, but NOT matched with anyone yet. Use this to test Browse / sending interest / accepting interest.",
    profile: {
      full_name: "Test Bride B",
      profile_type: "bride",
      age: 26,
      location: "Coimbatore",
      about_me: "Seeded test profile — safe to ignore or delete.",
    },
  },
  {
    email: "groom.b@agaram-test.dev",
    label: "Test Groom B — Elite, identity verified, unmatched (see Test Bride B).",
    profile: {
      full_name: "Test Groom B",
      profile_type: "groom",
      age: 33,
      location: "Bengaluru",
      about_me: "Seeded test profile — safe to ignore or delete.",
    },
  },
  {
    email: "collaborator@agaram-test.dev",
    label:
      "Test Collaborator — deliberately has NO profile at all. Use this account to accept a Family invite link (generated from one of the other accounts' /account page) and test the read-only Family dashboard.",
    profile: null,
  },
];

async function findUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  // A solo-founder dev seed never has enough real users for pagination
  // to matter — one page comfortably covers it.
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function GET(request: Request) {
  const expectedSecret = process.env.DEV_SEED_SECRET;
  if (!expectedSecret) {
    return Response.json(
      {
        error:
          "Not configured. Set DEV_SEED_SECRET as an environment variable (Vercel or .env.local) to enable this dev utility, then reload with ?secret=<that value>.",
      },
      { status: 404 }
    );
  }

  const providedSecret = new URL(request.url).searchParams.get("secret");
  if (providedSecret !== expectedSecret) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const admin = createAdminClient();
  const created: { email: string; label: string; id: string }[] = [];

  for (const account of ACCOUNTS) {
    let user = await findUserByEmail(admin, account.email);

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error || !data.user) {
        return Response.json(
          {
            error: `Couldn't create ${account.email}: ${error?.message ?? "unknown error"}`,
            createdSoFar: created,
          },
          { status: 500 }
        );
      }
      user = data.user;
    }

    created.push({ email: account.email, label: account.label, id: user.id });

    if (!account.profile) continue; // the collaborator account has no profile row

    const { full_name, profile_type, age, location, about_me } = account.profile;

    await admin.from("profiles").upsert(
      {
        id: user.id,
        full_name,
        profile_type,
        age,
        location,
        about_me,
        subscription_tier: "elite",
        subscription_expires_at: ONE_YEAR_FROM_NOW,
      },
      { onConflict: "id" }
    );

    await admin.from("preferences").upsert(
      {
        profile_id: user.id,
        age_min: 18,
        age_max: 60,
        preferred_locations: [],
        education_level: "any",
        open_to_relocating: "yes",
        languages: ["Tamil", "English"],
      },
      { onConflict: "profile_id" }
    );

    await admin.from("identity_verifications").upsert(
      {
        profile_id: user.id,
        status: "verified",
        method: "aadhaar",
        provider: "mock",
        verified_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );
  }

  // Pair Test Bride A + Test Groom A into a ready-made mutual match,
  // so messaging/milestones/family-sharing can be tested immediately
  // without walking through Browse -> interest -> accept by hand.
  const brideA = created.find((c) => c.email === "bride.a@agaram-test.dev");
  const groomA = created.find((c) => c.email === "groom.a@agaram-test.dev");
  let seededMutualMatch: { matchId: string } | null = null;

  if (brideA && groomA) {
    const [candidate_a, candidate_b] = orderPair(brideA.id, groomA.id);

    const { data: existingMatch } = await admin
      .from("matches")
      .select("id")
      .eq("candidate_a", candidate_a)
      .eq("candidate_b", candidate_b)
      .maybeSingle();

    if (existingMatch) {
      await admin.from("matches").update({ status: "mutual" }).eq("id", existingMatch.id);
      seededMutualMatch = { matchId: existingMatch.id };
    } else {
      const { data: newMatch } = await admin
        .from("matches")
        .insert({
          candidate_a,
          candidate_b,
          status: "mutual",
          initiated_by: candidate_a,
        })
        .select("id")
        .single();
      if (newMatch) seededMutualMatch = { matchId: newMatch.id };
    }
  }

  return Response.json({
    password: TEST_PASSWORD,
    note: "Log in at /login with any email below and the password above.",
    accounts: created,
    seededMutualMatch,
  });
}
