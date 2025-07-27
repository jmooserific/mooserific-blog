import "../globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 font-sans antialiased min-h-screen">
        {children}
        <footer className="text-center text-sm text-gray-400 py-6">
          &copy; {new Date().getFullYear()} Mooserific
        </footer>
      </body>
    </html>
  );
}
