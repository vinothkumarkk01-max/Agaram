"use client";

import { useActionState } from "react";
import { uploadProfilePhoto, deleteProfilePhoto } from "@/app/actions/photo";
import { ProfilePhotoAvatar } from "@/components/ProfilePhotoAvatar";
import type { Dictionary } from "@/lib/i18n/dictionary";

export function ProfilePhotoUpload({
  t,
  hasPhoto,
  previewUrl,
}: {
  t: Dictionary;
  hasPhoto: boolean;
  previewUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(uploadProfilePhoto, undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <ProfilePhotoAvatar url={previewUrl} initial="" size={64} />
        <p className="text-xs" style={{ color: "var(--text-soft)" }}>
          {hasPhoto ? t.account.photoBlurredNotice : t.account.photoNone}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-sm"
        />
        {state?.error && (
          <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
            {state.error}
          </p>
        )}
        {state?.success && (
          <p className="text-xs" style={{ color: "var(--ok)" }}>
            {state.success}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
          }}
        >
          {pending
            ? t.account.photoUploading
            : hasPhoto
              ? t.account.photoReplace
              : t.account.photoUpload}
        </button>
      </form>

      {hasPhoto && (
        <form action={deleteProfilePhoto}>
          <button
            type="submit"
            className="text-xs font-semibold self-start"
            style={{ color: "var(--text-soft)" }}
          >
            {t.account.photoRemove}
          </button>
        </form>
      )}
    </div>
  );
}
