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
  title: "Margin",
  description: "AI-native regulatory finding impact analyzer",
  icons: { icon: "/margin.svg" },
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
          <div className="flex items-center gap-2">
            <svg width={30} height={30} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Margin logo">
              <rect width="200" height="200" rx="45" fill="#212121"/>
              <path d="M92.8447 59.168C97.3491 56.9158 102.651 56.9158 107.155 59.168L160.198 85.6895C171.991 91.5859 171.991 108.414 160.198 114.311L107.155 140.832C102.651 143.084 97.3491 143.084 92.8447 140.832L39.8018 114.311C28.0094 108.414 28.0094 91.5859 39.8018 85.6895L92.8447 59.168Z" stroke="white" strokeWidth="10"/>
              <path d="M118 115C114.944 118.056 111.05 120.137 106.811 120.981C102.572 121.824 98.1781 121.391 94.185 119.737C90.1919 118.083 86.779 115.282 84.3778 111.688C81.9766 108.095 80.6949 103.87 80.6949 99.5477C80.6949 95.2257 81.9766 91.0006 84.3778 87.407C86.779 83.8133 90.1919 81.0124 94.185 79.3584C98.1781 77.7044 102.572 77.2716 106.811 78.1148C111.05 78.958 114.944 81.0393 118 84.0955L102.548 99.5477L118 115Z" fill="white"/>
            </svg>
            <span className="text-sm font-semibold tracking-wide">Margin</span>
          </div>
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
