"use client";

import { usePathname } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { CreatePostButton } from "./CreatePostButton";

interface HeaderButtonsProps {
  isAdmin: boolean;
}

// Client leaf solely so we can hide the buttons on /admin pages via usePathname.
// isAdmin is resolved on the server (SiteHeader) and passed in, so the correct
// button renders on first paint — no post-hydration fetch or content swap.
const HeaderButtons: React.FC<HeaderButtonsProps> = ({ isAdmin }) => {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="flex items-center justify-center sm:justify-end sm:ml-auto gap-2 flex-wrap">
      {isAdmin ? <CreatePostButton /> : <SignInButton />}
    </div>
  );
};

export { HeaderButtons };
