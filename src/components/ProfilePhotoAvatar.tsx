/**
 * Presentational only — pages resolve the signed URL themselves (via
 * src/lib/photo.ts, in parallel with their other data fetches) and
 * pass the result down, so this component never needs its own
 * Supabase client or async work. Falls back to the existing
 * initial-letter circle look when there's no photo or no URL could be
 * resolved for the caller (e.g. not yet mutually matched).
 *
 * Plain <img>, not next/image — these are short-lived signed URLs
 * from Supabase Storage with a token in the query string, a different
 * host per deployment, and no benefit from Next's build-time image
 * optimization pipeline.
 */
export function ProfilePhotoAvatar({
  url,
  initial,
  size = 48,
}: {
  url: string | null | undefined;
  initial: string;
  size?: number;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--bg-sunken)",
        color: "var(--text-soft)",
        fontSize: Math.max(12, Math.round(size * 0.4)),
      }}
    >
      {initial}
    </div>
  );
}
