import type { Metadata, Viewport } from "next";
import { Newsreader, Catamaran } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n/server";
import { SITE_URL } from "@/lib/site";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const catamaran = Catamaran({
  variable: "--font-catamaran",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const DESCRIPTION = "A verified, Tamil-first matrimonial platform.";

export const metadata: Metadata = {
  // Required for the auto-generated opengraph-image / twitter-image
  // <meta> tags to be absolute URLs rather than relative ones (social
  // crawlers won't resolve a relative image URL). agaramiya.com is
  // registered and confirmed live as of Sept 25, 2026 — see
  // src/lib/site.ts for the one remaining step (a fresh deploy so this
  // value is actually baked into the build).
  metadataBase: new URL(SITE_URL),
  title: "Agaramiya",
  description: DESCRIPTION,
  applicationName: "Agaramiya",
  // src/app/icon.png and src/app/apple-icon.png (Next's file-convention
  // icons) already add the favicon / apple-touch-icon <link> tags
  // automatically — appleWebApp below only adds the "launches like an
  // installed app" meta tags that those file-convention icons don't cover.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agaramiya",
  },
  // src/app/opengraph-image.tsx generates the actual image referenced
  // by these tags automatically — no `images` field needed here.
  openGraph: {
    title: "Agaramiya",
    description: DESCRIPTION,
    siteName: "Agaramiya",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agaramiya",
    description: DESCRIPTION,
  },
};

// themeColor lives on `viewport`, not `metadata` — Next.js warns (and
// won't render the tag) if it's placed on the metadata object instead.
export const viewport: Viewport = {
  themeColor: "#8E2346", // Agaramiya Maroon — matches the app icon background
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${newsreader.variable} ${catamaran.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
