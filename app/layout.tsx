import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import Preloader from '../components/Preloader'
import SmoothScroll from '../components/SmoothScroll'
import CustomCursor from '../components/CustomCursor'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-serif-display',
})

export const metadata: Metadata = {
  title: 'Girofy — Estúdio de Engenharia Digital',
  description: 'Encontramos o furo invisível do seu negócio e construímos a solução de tecnologia sob medida para resolvê-lo.',
  generator: 'v0.app',
  openGraph: {
    title: 'Girofy — Engenharia digital que resolve problemas reais',
    description: 'Desenvolvimento sob medida de sites, sistemas, aplicativos e automações focadas em resultado de negócio.',
    locale: 'pt_BR',
    type: 'website',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans antialiased`}>
        <Preloader />
        <SmoothScroll />
        <CustomCursor />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

