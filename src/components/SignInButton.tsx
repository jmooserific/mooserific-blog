"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";

const SignInButton: React.FC = () => (
  <a
    href={`/login?redirect=${encodeURIComponent('/')}`}
    title="Sign in"
    className="inline-flex items-center justify-center rounded-[10px] border border-transparent bg-transparent p-2 text-accent transition-colors hover:bg-accent/6 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
  >
    <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
  </a>
);

export { SignInButton };
