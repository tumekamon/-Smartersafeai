import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import { getTheme } from "@/lib/theme";
import "./globals.css";

// SmartSafe type system (design canvas, Brand board): Instrument Sans for everything
// people read and tap, Source Serif 4 for titles and big numbers, IBM Plex Mono for
// small uppercase labels, timers and IDs.
const sans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SmartSafe AI",
  description: "AI-assisted safety management for construction field teams.",
  appleWebApp: { capable: true, title: "SmartSafe", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b1f33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();

  return (
    <html
      lang="en"
      data-theme={theme === "system" ? undefined : theme}
      style={{ colorScheme: theme === "system" ? undefined : theme }}
      className={`${sans.variable} ${serif.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
