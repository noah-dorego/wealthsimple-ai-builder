import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "RegScope",
  description: "AI-native regulatory finding impact analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased flex flex-col h-screen">
        <header
          className="flex h-12 flex-shrink-0 items-center justify-between border-b px-6"
          style={{
            backgroundColor: "var(--bg-surface)",
            borderColor: "var(--border-subtle)",
          }}
        >
          <span className="text-sm font-semibold tracking-wide">RegScope</span>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
