import "../globals.css";
import { inter } from './fonts'
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>Mooserific Blog!</title>
        <meta name="description" content="A family photo blog!" />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen`}>
        <SiteHeader />
        <main>
          {children}
        </main>
        <Toaster position="top-right" richColors />
        <footer className="text-center text-sm text-[#845A2C] py-6">
          &copy; {new Date().getUTCFullYear()} Mooserific | Powered by <a href="https://github.com/jmooserific/mooserific-blog">Mooserific Blog!</a>
        </footer>
      </body>
    </html>
  );
}
