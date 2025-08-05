import { Quicksand, Sacramento } from 'next/font/google'

export const quicksand = Quicksand({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['500'],
})

export const sacramento = Sacramento({
  subsets: ['latin'],
  variable: '--font-sacramento',
  display: 'swap',
  weight: '400',
})