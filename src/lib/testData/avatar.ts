import sharp from "sharp";

/**
 * Generates a clearly-illustrated (never photorealistic) placeholder
 * "photo" for bulk test profiles — a gradient card with a couple of
 * soft decorative circles and the member's initial, rendered as an
 * SVG and rasterized through sharp. This is deliberately NOT a
 * synthetic photorealistic face: creating 200 fake photorealistic
 * "people" for a marriage-candidate database is a step this app
 * avoids even for private test data (see the seed route's own doc
 * comment). It's also never a real person's photo — nothing here is
 * scraped or sourced from anywhere; every pixel is generated from the
 * index alone.
 *
 * Runs the SAME two-derivative pipeline as a real upload
 * (`buildDerivatives()` in `app/actions/photo.ts` — duplicated here
 * rather than importing that "use server" file into a route handler,
 * same reasoning as `orderPair()`'s existing duplication) so
 * has_photo / blur-until-match behaves identically to a real photo
 * once these test profiles are seeded.
 */

const SIZE = 480;

function hueForIndex(index: number): number {
  // Golden-angle spacing — the standard trick for spreading N points
  // as evenly as possible around a circle regardless of N, so 200
  // avatars don't cluster into a handful of near-identical hues the
  // way `(index * 360) / 200` or a small fixed palette would.
  return (index * 137.508) % 360;
}

function buildAvatarSvg(initial: string, index: number): string {
  const hue = hueForIndex(index);
  const hue2 = (hue + 35) % 360;
  const accentHue = (hue + 180) % 360;

  const bg1 = `hsl(${hue.toFixed(1)}, 62%, 55%)`;
  const bg2 = `hsl(${hue2.toFixed(1)}, 58%, 40%)`;
  const circle1 = `hsl(${accentHue.toFixed(1)}, 55%, 65%)`;
  const circle2 = `hsl(${hue.toFixed(1)}, 45%, 80%)`;

  // Two soft, deterministically-placed decorative circles per avatar
  // so no two look identical even at the same hue neighborhood.
  const c1x = 60 + (index * 37) % 360;
  const c1y = 60 + (index * 53) % 360;
  const c2x = 40 + (index * 71) % 400;
  const c2y = 40 + (index * 29) % 400;

  const safeInitial = initial.trim().slice(0, 1).toUpperCase() || "A";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}" />
        <stop offset="100%" stop-color="${bg2}" />
      </linearGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)" />
    <circle cx="${c1x}" cy="${c1y}" r="120" fill="${circle1}" opacity="0.25" />
    <circle cx="${c2x}" cy="${c2y}" r="90" fill="${circle2}" opacity="0.18" />
    <text
      x="50%"
      y="52%"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="Georgia, 'Times New Roman', serif"
      font-size="200"
      font-weight="700"
      fill="rgba(255,255,255,0.92)"
    >${safeInitial}</text>
  </svg>`;
}

export async function buildTestAvatar(
  initial: string,
  index: number
): Promise<{ original: Buffer; blurred: Buffer }> {
  const svg = buildAvatarSvg(initial, index);
  const base = sharp(Buffer.from(svg));

  const original = await base.clone().jpeg({ quality: 85 }).toBuffer();

  // Same derivation as a real upload's blurred.jpg: shrink hard, then
  // re-enlarge and blur on top — see app/actions/photo.ts.
  const blurred = await base
    .clone()
    .resize({ width: 24 })
    .resize({ width: SIZE })
    .blur(12)
    .jpeg({ quality: 60 })
    .toBuffer();

  return { original, blurred };
}
