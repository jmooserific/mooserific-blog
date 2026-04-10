import Link from "next/link";
import { Suspense } from "react";
import { sacramento } from "../app/fonts";
import { HeaderButtons } from "./HeaderButtons";

const SiteHeader: React.FC = () => (
  <header className="max-w-4xl mx-auto px-4 sm:px-6">
    <div className="flex flex-col sm:flex-row sm:items-center py-4 gap-2">
      <h1 className={`${sacramento.className} text-5xl font-bold text-gray-900 text-center sm:text-left shrink-0`}>
        <Link href="/">Mooserific!</Link>
      </h1>
      <Suspense fallback={null}>
        <HeaderButtons />
      </Suspense>
    </div>
  </header>
);

export { SiteHeader };
