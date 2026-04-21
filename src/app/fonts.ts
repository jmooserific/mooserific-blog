import { Inter, Sacramento } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '700', '900'],
})

export const sacramento = Sacramento({
  subsets: ['latin'],
  variable: '--font-sacramento',
  display: 'swap',
  weight: '400',
})
