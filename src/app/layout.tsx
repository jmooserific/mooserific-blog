import "../globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-[Inter] antialiased min-h-screen">
        <header>
          <h1 className="font-[Pacifico] text-3xl font-bold m-6 text-gray-900 text-center">Mooserific!</h1>
        </header>
        <main>
          {children}
        </main>
        <footer className="text-center text-sm text-gray-400 py-6">
          &copy; {new Date().getFullYear()} Mooserific
        </footer>
      </body>
    </html>
  );
}
