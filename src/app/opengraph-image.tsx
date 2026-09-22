import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Social-share (Open Graph) image (Sept 2026, this round) — before
 * this, sharing the landing page link on WhatsApp (the realistic
 * diaspora sharing channel per the go-live checklist) showed no
 * branded preview card, just a bare title and description. Generated
 * rather than a static file so it stays in sync with the brand mark
 * asset without a separate export step.
 *
 * Deliberately no custom @font-face here: next/og's Satori renderer
 * only has fonts it's explicitly given, and fetching Newsreader/
 * Catamaran from Google Fonts at request/build time would fail in any
 * network-restricted environment (this project's own dev sandbox is
 * one — see AGENTS.md-adjacent build notes). Falls back to next/og's
 * bundled default font instead, which costs this one small preview
 * image some brand-typography fidelity but keeps it reliable
 * everywhere the app builds or runs.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const markPath = join(process.cwd(), "public/brand/agaramiya-mark-tight.png");
  const markBuffer = await readFile(markPath);
  const markDataUrl = `data:image/png;base64,${markBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(120% 100% at 30% 0%, #FFFFFF 0%, #FAF7F2 60%)",
          padding: 80,
        }}
      >
        <img
          src={markDataUrl}
          alt=""
          width={180}
          height={180}
          style={{ borderRadius: "9999px", marginBottom: 36 }}
        />
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            color: "#252225",
            letterSpacing: -1,
          }}
        >
          Agaramiya
        </div>
        <div
          style={{
            fontSize: 32,
            color: "#716B70",
            marginTop: 18,
            textAlign: "center",
            maxWidth: 820,
          }}
        >
          Verified members, thoughtful introductions, no endless browsing.
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            gap: 14,
          }}
        >
          {["Identity", "Employment", "Phone"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#F4E6EA",
                color: "#8E2346",
                fontSize: 22,
                fontWeight: 700,
                padding: "10px 20px",
                borderRadius: 9999,
              }}
            >
              {"✓"} {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
