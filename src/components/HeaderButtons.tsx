"use client";

import { usePathname } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { SignOutButton } from "./SignOutButton";
import { CreatePostButton } from "./CreatePostButton";

interface HeaderButtonsProps {
  isAdmin: boolean;
  // Display name of the signed-in admin (null when signed out).
  userName: string | null;
}

// Client leaf only so we can drop the Create Post action on the editor itself
// (where it's redundant) via usePathname. isAdmin/userName are resolved on the
// server (SiteHeader) and passed in, so the correct UI renders on first paint —
// no post-hydration fetch or content swap.
const HeaderButtons: React.FC<HeaderButtonsProps> = ({ isAdmin, userName }) => {
  const pathname = usePathname();
  const onEditor = pathname.startsWith("/admin");

  return (
    <div className="flex items-center justify-center sm:justify-end sm:ml-auto gap-2 flex-wrap">
      {isAdmin ? (
        <>
          {userName && (
            <span className="text-sm text-accent" title={`Signed in as ${userName}`}>
              {userName}
            </span>
          )}
          {!onEditor && <CreatePostButton />}
          <SignOutButton />
        </>
      ) : (
        <SignInButton />
      )}
    </div>
  );
};

export { HeaderButtons };
