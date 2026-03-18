import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Pomodoro Timer – Focus & Productivity App',
  description: 'A beautiful Pomodoro timer to boost your focus and productivity. Customize work intervals, breaks, and rounds. Stay on track with ambient music and visual cues.',
  keywords: ['pomodoro', 'pomodoro timer', 'focus timer', 'productivity', 'time management', 'work timer', 'break timer', 'pomodoro technique'],
  authors: [{ name: 'Pomodoro Prompts' }],
  openGraph: {
    title: 'Pomodoro Timer – Focus & Productivity App',
    description: 'A beautiful Pomodoro timer to boost your focus and productivity. Customize work intervals, breaks, and rounds.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Pomodoro Timer – Focus & Productivity App',
    description: 'A beautiful Pomodoro timer to boost your focus and productivity.',
  },
  manifest: '/favicon/site.webmanifest',
  icons: {
    icon: [
      {
        url: '/favicon/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        url: '/favicon/favicon.ico',
        sizes: 'any',
      },
    ],
    apple: '/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
