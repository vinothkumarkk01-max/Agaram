import Image from "next/image";

/**
 * The real Agaramiya brand monogram — the founder-supplied artwork (see
 * Agaram_Visual_Design_System_v1.md's "Brand mark" section) that every
 * generated app icon/favicon is already built from
 * (scripts/generate-icons.mjs). Every in-app header still drew its own
 * maroon-gradient circle with a plain "அ" character instead — the
 * placeholder that artwork was supposed to replace everywhere (founder
 * feedback, Sept 2026: "why still using old logo"). This is the one place
 * that reference lives now, so every header stays in sync if the artwork
 * ever changes.
 *
 * Uses `agaramiya-mark-tight.png`, not the icon pipeline's own
 * `agaramiya-mark-source.png` — that master deliberately pads the
 * monogram to ~66% of a square canvas (so OS icon masks have room to
 * crop it), which reads as "logo appearing very small" once it's also
 * clipped to a small circular badge here (founder feedback, Sept
 * 2026). `agaramiya-mark-tight.png` is a plain center-crop of that same
 * source — no new artwork, just less of the padding — kept as its own
 * file rather than changing the master, since the master also feeds
 * scripts/generate-icons.mjs and shouldn't move out of sync with the
 * OS-icon safe-zone math baked in there.
 */
export function BrandMark({
  size = 40,
  alt = "",
}: {
  size?: number;
  alt?: string;
}) {
  return (
    <Image
      src="/brand/agaramiya-mark-tight.png"
      alt={alt}
      width={440}
      height={440}
      className="rounded-full shrink-0 object-cover"
      style={{ width: size, height: size }}
    />
  );
}
