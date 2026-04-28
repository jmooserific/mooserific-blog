import "../globals.css";
import type { Metadata, Viewport } from "next";
import { inter } from './fonts'
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
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
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen`}>
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
