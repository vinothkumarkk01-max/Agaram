import { createAdminClient } from "@/lib/supabase/admin";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/photo";
import { generateProfiles, type GeneratedProfile } from "@/lib/testData/generateProfiles";
import { buildTestAvatar } from "@/lib/testData/avatar";

/**
 * Dev-only utility: bulk-seeds up to 100 bride + 100 groom test
 * profiles, each with a unique generated (never real, never
 * photorealistic — see lib/testData/avatar.ts) placeholder photo, so
 * a founder can browse a realistically-sized feed instead of the
 * fixed 7-account set `seed-test-data` creates. Built Sept 2026 in
 * response to "create 100 unique profiles for both bride and groom
 * ... so I can visualise how customer journey feels like."
 *
 * Same safety model as `seed-test-data`: gated behind DEV_SEED_SECRET
 * (reused, not a second secret to manage), does nothing until that
 * env var is set, and 404s on any missing/wrong secret. Idempotent —
 * every profile is generated deterministically from its index (see
 * generateProfiles()), so calling this again with the same
 * offset/count just re-finds the same accounts rather than
 * duplicating them.
 *
 * BATCHED ON PURPOSE: 100 test accounts each need an auth user plus
 * several table upserts plus two image uploads — comfortably more
 * work than one serverless request should try to do in a single
 * call. Call this URL repeatedly with an increasing `offset`
 * (`count` defaults to 20) until the response's `remaining` is 0 for
 * both genders — the response always says what the next offset
 * should be.
 *
 * CLEANUP: there's no delete route for these (same as
 * `seed-test-data`) — remove them from the Supabase dashboard when
 * you're done testing, e.g. in the SQL editor:
 *   delete from auth.users where email like 'test.bride-%@agaram-test.dev'
 *      or email like 'test.groom-%@agaram-test.dev';
 * (profiles/preferences/verifications/storage objects all cascade or
 * are cleaned up by their own `on delete cascade` / the photo upload
 * path being keyed by the now-deleted user id.)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEST_PASSWORD = "AgaramiyaBulkTest#2026";
const TOTAL_PER_GENDER = 100;
const DEFAULT_BATCH_COUNT = 20;
const ONE_YEAR_FROM_NOW = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  // Same approach as seed-test-data's own findUserByEmail — a dev
  // seed never has enough real users for pagination to matter.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 2000 });
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function seedOneProfile(
  admin: ReturnType<typeof createAdminClient>,
  spec: GeneratedProfile,
  globalIndex: number
): Promise<{ email: string; id: string; full_name: string; profile_type: string }> {
  const email = `test.${spec.slug}@agaram-test.dev`;

  let user = await findUserByEmail(admin, email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Couldn't create ${email}: ${error?.message ?? "unknown error"}`);
    }
    user = data.user;
  }

  await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: spec.full_name,
      profile_type: spec.profile_type,
      age: spec.age,
      location: spec.location,
      about_me: spec.about_me,
      family_type: spec.family_type,
      diet: spec.diet,
      native_district: spec.native_district,
      has_photo: true,
      subscription_tier: "elite",
      subscription_expires_at: ONE_YEAR_FROM_NOW,
    },
    { onConflict: "id" }
  );

  // Broad on purpose — every seeded profile's OWN preferences stay
  // wide open (age 18-60, no location/diet/family-type filter) so
  // whichever seeded account you log into as the "viewer", the full
  // opposite-gender batch shows up in Browse rather than being
  // filtered down to a handful. get_match_candidates() filters by the
  // VIEWER's preferences against each candidate's plain profile
  // fields, so this is what actually controls Browse feed size.
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

  if (spec.identity_status !== "none") {
    await admin.from("identity_verifications").upsert(
      {
        profile_id: user.id,
        status: spec.identity_status,
        method: "aadhaar",
        provider: "mock",
        verified_at: spec.identity_status === "verified" ? new Date().toISOString() : null,
      },
      { onConflict: "profile_id" }
    );
  }

  if (spec.is_phone_verified) {
    await admin.from("phone_verifications").upsert(
      {
        profile_id: user.id,
        status: "verified",
        phone_number: `+91${9000000000 + globalIndex}`,
        verified_at: new Date().toISOString(),
      },
      { onConflict: "profile_id" }
    );
  }

  const { original, blurred } = await buildTestAvatar(spec.full_name[0], globalIndex);
  const storage = admin.storage.from(PROFILE_PHOTOS_BUCKET);
  const [originalUpload, blurredUpload] = await Promise.all([
    storage.upload(`${user.id}/original.jpg`, original, { contentType: "image/jpeg", upsert: true }),
    storage.upload(`${user.id}/blurred.jpg`, blurred, { contentType: "image/jpeg", upsert: true }),
  ]);
  if (originalUpload.error || blurredUpload.error) {
    throw new Error(
      `Couldn't upload photo for ${email}: ${originalUpload.error?.message ?? blurredUpload.error?.message}`
    );
  }

  return { email, id: user.id, full_name: spec.full_name, profile_type: spec.profile_type };
}

export async function GET(request: Request) {
  const expectedSecret = process.env.DEV_SEED_SECRET?.trim();
  if (!expectedSecret) {
    return Response.json(
      {
        error:
          "Not configured. Set DEV_SEED_SECRET as an environment variable (same one seed-test-data uses) to enable this dev utility, then reload with ?secret=<that value>.",
      },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const providedSecret = url.searchParams.get("secret")?.trim();
  if (!providedSecret || providedSecret !== expectedSecret) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  const offsetParam = Number(url.searchParams.get("offset") ?? "0");
  const countParam = Number(url.searchParams.get("count") ?? String(DEFAULT_BATCH_COUNT));
  const offset = Number.isFinite(offsetParam) && offsetParam >= 0 ? Math.floor(offsetParam) : 0;
  const count =
    Number.isFinite(countParam) && countParam > 0 ? Math.min(Math.floor(countParam), 50) : DEFAULT_BATCH_COUNT;

  const brideSpecs = generateProfiles("bride", offset, count, TOTAL_PER_GENDER);
  const groomSpecs = generateProfiles("groom", offset, count, TOTAL_PER_GENDER);

  const admin = createAdminClient();
  const created: { email: string; id: string; full_name: string; profile_type: string }[] = [];

  try {
    // Small concurrency, not one giant Promise.all — 100% parallel
    // across a batch of 40 (20 brides + 20 grooms) would fire a lot of
    // simultaneous auth-admin + storage calls at once; a modest chunk
    // size keeps this comfortably inside typical serverless rate
    // limits while still being far faster than fully sequential.
    const allSpecs = [...brideSpecs, ...groomSpecs];
    const CHUNK = 5;
    for (let i = 0; i < allSpecs.length; i += CHUNK) {
      const chunk = allSpecs.slice(i, i + CHUNK);
      const results = await Promise.all(
        chunk.map((spec, j) => seedOneProfile(admin, spec, offset + i + j))
      );
      created.push(...results);
    }
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
        createdSoFar: created,
      },
      { status: 500 }
    );
  }

  const nextOffset = offset + count;
  const remaining = Math.max(0, TOTAL_PER_GENDER - nextOffset);

  return Response.json({
    password: TEST_PASSWORD,
    note: "Log in at /login with any email below and the password above.",
    thisBatch: { offset, count, created: created.length },
    perGenderTotal: TOTAL_PER_GENDER,
    remainingPerGender: remaining,
    nextCallUrl:
      remaining > 0
        ? `${url.pathname}?secret=${providedSecret}&offset=${nextOffset}&count=${count}`
        : null,
    accounts: created,
  });
}
