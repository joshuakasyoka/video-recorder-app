import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Video Transcription App',
  description: 'Upload and transcribe your videos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif' }}>{children}</body>
    </html>
  )
}