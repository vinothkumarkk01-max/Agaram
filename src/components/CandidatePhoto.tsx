/**
 * A large, prominent photo for someone ELSE's profile — a candidate on
 * Browse, today's introduction, a received/sent interest, a mutual
 * match. Direct founder feedback (Sept 2026): "I am interested [to]
 * see other profile picture big as much as possible, rather than just
 * as icon" — every one of those screens showed a small circular
 * avatar (48–64px) next to a block of text, which read as an icon, not
 * a photo worth looking at (and gave a member uploading their own
 * photo no reason to pick a good one).
 *
 * Deliberately a SEPARATE component from ProfilePhotoAvatar, which
 * keeps its small circular-icon role for identity CHROME — the
 * member's own avatar in the dashboard top bar, the profile menu, and
 * so on. That's the right size for "which account am I in," and
 * shrinking it further isn't this feedback's target; this component
 * is only for showing another member's photo as the actual subject of
 * the screen.
 *
 * A 4:5 portrait frame (object-cover, never distorted) suits a person
 * photo better than a wide crop and matches the aspect competitor apps
 * use for the same reason. The privacy chip overlaid at the
 * bottom-left is the Visual Design System v1 doc's own spec ("privacy
 * state moved onto the photo itself... rather than a bare 'Verified'
 * tag") — shown only while `isOriginal` is false, i.e. the resolved
 * photo is the blurred version because this viewer and the candidate
 * aren't a mutual match yet (src/lib/photo.ts already decided that
 * server-side; this component only reflects it, never re-decides it).
 * Verified/phone badges are NOT drawn here — per that same doc, those
 * stay in the info block below the photo, not on top of it.
 */
export function CandidatePhoto({
  url,
  isOriginal,
  initial,
  privacyLabel,
}: {
  url: string | null | undefined;
  isOriginal?: boolean;
  initial: string;
  privacyLabel?: string;
}) {
  return (
    <div
      className="relative w-full aspect-[4/5] overflow-hidden shrink-0"
      style={{ background: "var(--bg-sunken)" }}
    >
      {url ? (
        // Plain <img>, not next/image — same reasoning as
        // ProfilePhotoAvatar: a short-lived signed Supabase Storage URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold"
          style={{
            color: "var(--text-soft)",
            fontSize: 56,
            fontFamily: "var(--font-display)",
          }}
        >
          {initial}
        </div>
      )}
      {url && !isOriginal && privacyLabel && (
        <div
          className="absolute left-3 bottom-3 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: "rgba(37, 34, 37, 0.6)", color: "#fff" }}
        >
          {privacyLabel}
        </div>
      )}
    </div>
  );
}
