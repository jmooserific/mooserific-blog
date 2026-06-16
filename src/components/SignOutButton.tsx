"use client";

import { usePathname } from "next/navigation";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";

// Posts to the logout route and returns to the page the user was on. usePathname
// only ever yields an app-internal path, so it's a safe `redirect` value.
const SignOutButton: React.FC = () => {
  const pathname = usePathname();
  const redirect = pathname && pathname.startsWith("/") ? pathname : "/";

  return (
    <form action={`/api/auth/logout?redirect=${encodeURIComponent(redirect)}`} method="post">
      <button
        type="submit"
        title="Sign out"
        className="inline-flex items-center justify-center rounded-[10px] border border-red-700/15 bg-transparent p-2 text-red-700/80 transition-colors hover:bg-red-900/6 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Sign out</span>
      </button>
    </form>
  );
};

export { SignOutButton };
