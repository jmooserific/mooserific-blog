"use client";

import { LockClosedIcon } from "@heroicons/react/24/outline";

const SignInButton: React.FC = () => (
  <a
    href={`/login?redirect=${encodeURIComponent('/')}`}
    title="Sign in"
    className="inline-flex items-center justify-center rounded-full border border-transparent bg-white p-2 text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
  >
    <LockClosedIcon className="h-5 w-5" aria-hidden="true" />
  </a>
);

export { SignInButton };
