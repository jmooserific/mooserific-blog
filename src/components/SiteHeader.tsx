import Link from "next/link";
import { cookies } from "next/headers";
import { zillaSlab } from "../app/fonts";
import { authorFromUsername, getSessionCookieName, getSessionFromToken } from "@/lib/auth";
import { HeaderButtons } from "./HeaderButtons";

// Width tracks the post cards (max-w-6xl) so the title aligns with the card edges.
// Server Component: resolves admin status from the session cookie so the header
// renders the correct button on first paint (no client-side auth fetch/CLS).
const SiteHeader = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(getSessionCookieName())?.value;
  const session = await getSessionFromToken(sessionToken);
  const isAdmin = session !== null;
  const userName = session ? authorFromUsername(session.user) : null;

  return (
    <header className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center py-4 gap-2">
        <h1 className={`${zillaSlab.className} text-[2.5rem] font-medium text-accent text-center sm:text-left shrink-0`}>
          <Link href="/">Mooserific!</Link>
        </h1>
        <HeaderButtons isAdmin={isAdmin} userName={userName} />
      </div>
    </header>
  );
};

export { SiteHeader };
