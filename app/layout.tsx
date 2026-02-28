import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400'],
})

export const metadata: Metadata = {
  title: 'RegScope',
  description: 'AI-native regulatory change impact analyzer',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <header
          className="flex h-12 items-center justify-between border-b px-6"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-sm font-semibold tracking-wide" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            RegScope
          </span>
          <div>{/* placeholder for upload button */}</div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  )
}
