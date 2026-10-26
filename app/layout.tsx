import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getTheme } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartSafe AI",
  description: "AI-assisted safety management for construction field teams.",
  appleWebApp: { capable: true, title: "SmartSafe", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2f6df6",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
