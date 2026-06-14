import "../globals.css";
import type { Metadata, Viewport } from "next";
import { mulish, zillaSlab } from './fonts'
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  // Lets per-page canonical/OG URLs resolve to absolute links when NEXT_PUBLIC_SITE_URL is set.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: "Mooserific Blog!",
  description: "A family photo blog!",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${mulish.className} ${zillaSlab.variable} bg-gray-50 text-gray-900 antialiased min-h-screen`}>
        <SiteHeader />
        <main>
          {children}
        </main>
        <Toaster position="top-right" richColors />
        <footer className="text-center text-sm text-accent py-6">
          &copy; {new Date().getUTCFullYear()} Mooserific | Powered by <a href="https://github.com/jmooserific/mooserific-blog">Mooserific Blog!</a>
        </footer>
      </body>
    </html>
  );
}
