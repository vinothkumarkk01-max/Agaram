import type { SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

// Long enough that a single page render (candidate list, chat header,
// account page) never has a link expire mid-view; short enough that a
// signed URL pasted somewhere else goes stale within the day rather
// than becoming a permanent, unrevocable link to someone's photo.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ProfilePhoto = { url: string; isOriginal: boolean };

/**
 * Resolves the best photo the CALLING member's own session is allowed
 * to see for `profileId` — original.jpg if a signed-in policy grants
 * it (the owner themselves, a mutual match, or an admin — see
 * supabase/schema.sql Phase 22's storage.objects policies), otherwise
 * blurred.jpg (visible to any signed-in member), otherwise null (no
 * photo, or not signed in at all). This is a convenience wrapper, not
 * the security boundary — createSignedUrl() only succeeds when
 * storage RLS already allows the read, so a caller can always try the
 * original first without risking exposing it to someone unauthorized.
 */
export async function getProfilePhotoUrl(
  supabase: SupabaseClient,
  profileId: string,
  hasPhoto: boolean
): Promise<ProfilePhoto | null> {
  if (!hasPhoto) return null;

  const original = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(`${profileId}/original.jpg`, SIGNED_URL_TTL_SECONDS);
  if (!original.error && original.data?.signedUrl) {
    return { url: original.data.signedUrl, isOriginal: true };
  }

  const blurred = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .createSignedUrl(`${profileId}/blurred.jpg`, SIGNED_URL_TTL_SECONDS);
  if (!blurred.error && blurred.data?.signedUrl) {
    return { url: blurred.data.signedUrl, isOriginal: false };
  }

  return null;
}

/**
 * Batch version for a list of candidate/match rows — fetches every
 * signed URL in parallel and returns a Map keyed by profile id, so a
 * page can look results up by id while mapping over its own row list.
 */
export async function getProfilePhotoUrls(
  supabase: SupabaseClient,
  rows: { id: string; hasPhoto: boolean }[]
): Promise<Map<string, ProfilePhoto>> {
  const entries = await Promise.all(
    rows.map(async (row) => {
      const photo = await getProfilePhotoUrl(supabase, row.id, row.hasPhoto);
      return [row.id, photo] as const;
    })
  );

  const map = new Map<string, ProfilePhoto>();
  for (const [id, photo] of entries) {
    if (photo) map.set(id, photo);
  }
  return map;
}
