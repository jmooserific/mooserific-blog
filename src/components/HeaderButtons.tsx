"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignInButton } from "./SignInButton";
import { CreatePostButton } from "./CreatePostButton";

const HeaderButtons: React.FC = () => {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isAdminPage) return;

    let cancelled = false;
    fetch('/api/auth/status', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { authenticated: false })
      .then(data => { if (!cancelled) setIsAdmin(Boolean(data?.authenticated)); })
      .catch(() => { });

    return () => { cancelled = true; };
  }, [isAdminPage]);

  if (isAdminPage) return null;

  return (
    <div className="flex items-center justify-center sm:justify-end sm:ml-auto gap-2 flex-wrap">
      {isAdmin ? <CreatePostButton /> : <SignInButton />}
    </div>
  );
};

export { HeaderButtons };
