import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RateMyRide - Rate Your Kombi Ride Experience',
  description: 'Scan QR codes in kombis to rate your ride experience. Rate cleanliness, safety, friendliness, and punctuality.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}

