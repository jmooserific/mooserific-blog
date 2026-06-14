import { Mulish, Zilla_Slab } from 'next/font/google'

// Body / everything: Mulish — humanist sans with rounded terminals that echo the
// site's rounded-corner language. Same weight range the type scale was built on.
export const mulish = Mulish({
  subsets: ['latin'],
  variable: '--font-mulish',
  display: 'swap',
  weight: ['300', '400', '500', '700', '900'],
})

// Site title: Zilla Slab — a friendly slab serif. Character without the of-an-era
// feel of the old script face. Used at weight 500 in SiteHeader.
export const zillaSlab = Zilla_Slab({
  subsets: ['latin'],
  variable: '--font-zilla-slab',
  display: 'swap',
  weight: ['500'],
})
