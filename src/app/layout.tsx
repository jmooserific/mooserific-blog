import "../globals.css";
import { inter, sacramento } from './fonts'
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Mooserific Blog!</title>
        <meta name="description" content="A family photo blog!" />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen`}>
        <header>
          <h1 className={`${sacramento.className} text-6xl font-bold m-6 text-gray-900 text-center`}><Link href="/">Mooserific!</Link></h1>
        </header>
        <main>
          {children}
        </main>
        <footer className="text-center text-sm text-gray-900 py-6">
          &copy; {new Date().getFullYear()} Mooserific
        </footer>
      </body>
    </html>
  );
}
