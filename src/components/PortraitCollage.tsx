/**
 * A scattered, editorial-style collage of "portrait cards" for the
 * landing-page hero — built in response to founder feedback (Sept
 * 2026): the hero was "almost entirely textual/functional" for a
 * matrimonial product, and should instead show people, framed as
 * "editorial + premium + warm + trustworthy" rather than
 * "swipe + dating + gamification".
 *
 * IMPORTANT — these are NOT real member photos, and never claimed to
 * be. The five images below (public/brand/portraits/portrait-1.jpg …
 * portrait-5.jpg) are AI-generated headshot photography the founder
 * supplied, cropped from a 10-photo reference sheet to fit each
 * card's frame (face + shoulders, top-anchored so hair/eyes stay in
 * frame). They're used purely as decorative atmosphere — the same
 * role editorial stock photography plays on any marketing page — not
 * as a stand-in for a "real testimonial" or "real member": no names,
 * no quotes, no verified badges are attached to these cards, and none
 * should be added, to stay consistent with the app's honesty-first
 * positioning (no fabricated signals, matching the "no fabricated
 * score" principle used everywhere else in the product).
 *
 * Before real photography existed, each card rendered an abstract
 * "silhouette study" (blurred radial-gradient glows in the brand
 * palette) instead of a photo — that fallback is kept below and still
 * renders automatically for any card whose `photoSrc` is unset, so a
 * card can be swapped back to the placeholder (or given a different
 * photo later) without touching the layout.
 */

type Card = {
  /** Real photo, once available — e.g. "/brand/portraits/member-1.jpg". */
  photoSrc?: string;
  base: string;
  glowHead: string;
  glowBody: string;
  rotate: string;
  translateY: string;
  size: "lg" | "md" | "sm";
};

const CARDS: Card[] = [
  {
    photoSrc: "/brand/portraits/portrait-1.jpg",
    base: "linear-gradient(165deg, #F6EAD8 0%, #EAD9C4 55%, #DCC6A6 100%)",
    glowHead: "radial-gradient(circle, rgba(142,35,70,0.32) 0%, rgba(142,35,70,0) 70%)",
    glowBody: "radial-gradient(ellipse, rgba(177,138,87,0.30) 0%, rgba(177,138,87,0) 72%)",
    rotate: "-rotate-[6deg]",
    translateY: "sm:-translate-y-2",
    size: "lg",
  },
  {
    photoSrc: "/brand/portraits/portrait-2.jpg",
    base: "linear-gradient(165deg, #F4E6EA 0%, #E6C9D2 55%, #D3A9B8 100%)",
    glowHead: "radial-gradient(circle, rgba(100,24,47,0.30) 0%, rgba(100,24,47,0) 70%)",
    glowBody: "radial-gradient(ellipse, rgba(142,35,70,0.26) 0%, rgba(142,35,70,0) 72%)",
    rotate: "rotate-[3deg]",
    translateY: "sm:translate-y-4",
    size: "md",
  },
  {
    photoSrc: "/brand/portraits/portrait-3.jpg",
    base: "linear-gradient(165deg, #F2EFED 0%, #E3DCD3 55%, #CDBFAA 100%)",
    glowHead: "radial-gradient(circle, rgba(177,138,87,0.34) 0%, rgba(177,138,87,0) 70%)",
    glowBody: "radial-gradient(ellipse, rgba(142,35,70,0.20) 0%, rgba(142,35,70,0) 72%)",
    rotate: "-rotate-[2deg]",
    translateY: "sm:-translate-y-4",
    size: "lg",
  },
  {
    photoSrc: "/brand/portraits/portrait-4.jpg",
    base: "linear-gradient(165deg, #F6EAD8 0%, #E6C9D2 55%, #C99AA8 100%)",
    glowHead: "radial-gradient(circle, rgba(142,35,70,0.28) 0%, rgba(142,35,70,0) 70%)",
    glowBody: "radial-gradient(ellipse, rgba(100,24,47,0.24) 0%, rgba(100,24,47,0) 72%)",
    rotate: "rotate-[5deg]",
    translateY: "sm:translate-y-2",
    size: "md",
  },
  {
    photoSrc: "/brand/portraits/portrait-5.jpg",
    base: "linear-gradient(165deg, #F2EFED 0%, #EAD9C4 55%, #D3B98F 100%)",
    glowHead: "radial-gradient(circle, rgba(177,138,87,0.36) 0%, rgba(177,138,87,0) 70%)",
    glowBody: "radial-gradient(ellipse, rgba(177,138,87,0.22) 0%, rgba(177,138,87,0) 72%)",
    rotate: "-rotate-[4deg]",
    translateY: "sm:-translate-y-1",
    size: "sm",
  },
];

const SIZE_CLASS: Record<Card["size"], string> = {
  lg: "aspect-[3/4]",
  md: "aspect-[3/4]",
  sm: "aspect-[4/5]",
};

function PortraitCard({ card }: { card: Card }) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-md transition-transform duration-300 hover:-translate-y-1 ${card.rotate} ${card.translateY} ${SIZE_CLASS[card.size]}`}
      style={{ border: "1px solid var(--line)" }}
      aria-hidden="true"
    >
      {card.photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.photoSrc} alt="" className="w-full h-full object-cover" />
      ) : (
        <>
          {/* Base warm gradient — the "paper" the light study sits on. */}
          <div className="absolute inset-0" style={{ background: card.base }} />
          {/* Soft blurred head-and-shoulders glow, like an out-of-focus
              portrait rather than a flat icon cutout. */}
          <div
            className="absolute rounded-full"
            style={{
              background: card.glowHead,
              width: "58%",
              height: "40%",
              left: "21%",
              top: "14%",
              filter: "blur(6px)",
            }}
          />
          <div
            className="absolute"
            style={{
              background: card.glowBody,
              width: "88%",
              height: "56%",
              left: "6%",
              bottom: "-14%",
              borderRadius: "50% 50% 0 0",
              filter: "blur(8px)",
            }}
          />
          {/* A faint warm vignette so the corners read as "lit softly",
              not flat-filled. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 30%, rgba(255,255,255,0.25) 0%, rgba(37,34,37,0.05) 100%)",
            }}
          />
          {/* Editorial "caption rule" — a thin gold hairline at the
              foot of the card, deliberately left blank. */}
          <div
            className="absolute left-[18%] right-[18%]"
            style={{ bottom: "9%", height: "1px", background: "var(--gold)", opacity: 0.55 }}
          />
        </>
      )}
    </div>
  );
}

export function PortraitCollage() {
  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 w-full max-w-xl mx-auto"
      role="presentation"
    >
      {CARDS.map((card, i) => (
        <div key={i} className={i === 4 ? "hidden sm:block" : undefined}>
          <PortraitCard card={card} />
        </div>
      ))}
    </div>
  );
}
