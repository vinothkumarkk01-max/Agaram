"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_PHOTOS_BUCKET } from "@/lib/photo";

export type PhotoActionState = { error?: string; success?: string } | undefined;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB — generous for a phone camera photo, small enough not to time out a server action

// Deliberately NOT including HEIC/HEIF (the default format for recent
// iPhone camera photos) — sharp's prebuilt binary on Vercel isn't
// guaranteed to be built with HEIF decode support, and failing loudly
// with a clear message here beats a confusing 500 mid-upload. Most
// browsers already convert a `<input type="file" accept="image/*">`
// selection to JPEG before it reaches this action, and iPhones
// themselves offer a "Most Compatible" camera format setting that
// saves JPEG directly — this only affects a HEIC file picked from an
// existing library.
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Generates the two derivatives every uploaded photo gets:
 *
 * - original.jpg: `.rotate()` bakes in the camera's EXIF orientation
 *   BEFORE re-encoding (otherwise a portrait phone photo would render
 *   sideways once EXIF is gone), then re-encodes as a normal-quality
 *   JPEG capped to 1600px on the long edge. sharp strips all other
 *   metadata by default — it only keeps EXIF/ICC/GPS data if you
 *   explicitly call `.withMetadata()`, which nothing here does — so
 *   this also quietly strips any embedded GPS location before the
 *   file ever reaches storage. That's a deliberate privacy property
 *   to document, not an accident: see README.
 * - blurred.jpg: shrunk to a tiny 24px-wide version and re-enlarged
 *   (destroying almost all detail through the resampling itself),
 *   then a further gaussian blur on top for good measure. This is
 *   what unmatched members see everywhere — see storage.objects'
 *   policies in supabase/schema.sql, Phase 22, for why a member's
 *   browser can never even request the unblurred file before a
 *   mutual match exists.
 */
async function buildDerivatives(input: Buffer): Promise<{ original: Buffer; blurred: Buffer }> {
  const base = sharp(input).rotate();

  const original = await base
    .clone()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const blurred = await base
    .clone()
    .resize({ width: 24, withoutEnlargement: true })
    .resize({ width: 480 })
    .blur(12)
    .jpeg({ quality: 60 })
    .toBuffer();

  return { original, blurred };
}

export async function uploadProfilePhoto(
  _prevState: PhotoActionState,
  formData: FormData
): Promise<PhotoActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { error: "Please upload a JPEG, PNG, or WEBP photo (not HEIC — export or screenshot it first)." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "That photo is too large — please use one under 8 MB." };
  }

  let derivatives: { original: Buffer; blurred: Buffer };
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    derivatives = await buildDerivatives(inputBuffer);
  } catch {
    return { error: "That file doesn't look like a valid photo — please try a different one." };
  }

  const storage = supabase.storage.from(PROFILE_PHOTOS_BUCKET);

  const [originalUpload, blurredUpload] = await Promise.all([
    storage.upload(`${user.id}/original.jpg`, derivatives.original, {
      contentType: "image/jpeg",
      upsert: true,
    }),
    storage.upload(`${user.id}/blurred.jpg`, derivatives.blurred, {
      contentType: "image/jpeg",
      upsert: true,
    }),
  ]);

  if (originalUpload.error || blurredUpload.error) {
    return {
      error:
        originalUpload.error?.message ??
        blurredUpload.error?.message ??
        "Couldn't save your photo — please try again.",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ has_photo: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/matches/sent");
  revalidatePath("/matches/received");
  revalidatePath("/matches/mutual");
  return { success: "Photo uploaded. It's blurred for everyone until you match — see below." };
}

export async function deleteProfilePhoto(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .remove([`${user.id}/original.jpg`, `${user.id}/blurred.jpg`]);

  await supabase
    .from("profiles")
    .update({ has_photo: false, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/matches/sent");
  revalidatePath("/matches/received");
  revalidatePath("/matches/mutual");
}
