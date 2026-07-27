// app/layout.tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import AppShell from "@/components/AppShell";

import { LogViewer, LogViewerShortcut } from "@/components/dev/LogViewer";

const bodyFont = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ระบบจัดการคำขอดับไฟ",
  description: "ระบบจัดการคำขอดับไฟสำหรับการไฟฟ้าส่วนภูมิภาค",
  icons: {
    icon: "/image.png",
    shortcut: "/image.png",
    apple: "/image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={bodyFont.variable}>
      <body className="flex min-h-screen flex-col bg-[var(--app-bg)] text-[var(--app-text)] antialiased">
        <Providers>
          <AppShell>{children}</AppShell>

          {/* ---- Dev tools (development only) ---- */}
          {process.env.NODE_ENV === "development" && <LogViewer />}
          {process.env.NODE_ENV === "development" && <LogViewerShortcut />}
        </Providers>
      </body>
    </html>
  );
}
