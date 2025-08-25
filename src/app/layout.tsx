import "../globals.css";
import { quicksand, sacramento } from './fonts'
import Link from "next/link";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="alternate icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/web-app-manifest-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/web-app-manifest-512x512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/favicon.svg" color="#111827" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mooserific" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>Mooserific Blog!</title>
        <meta name="description" content="A family photo blog!" />
      </head>
      <body className={`${quicksand.className} bg-gray-50 text-gray-900 antialiased min-h-screen`}>
        <header>
          <h1 className={`${sacramento.className} text-6xl font-bold m-6 text-gray-900 text-center`}><Link href="/">Mooserific!</Link></h1>
        </header>
        <main>
          {children}
        </main>
        <Toaster position="top-right" richColors />
        <footer className="text-center text-sm text-gray-900 py-6">
          &copy; {new Date().getUTCFullYear()} Mooserific | Powered by <a href="https://github.com/jmooserific/mooserific-blog">Mooserific Blog!</a>
        </footer>
      </body>
    </html>
  );
}
