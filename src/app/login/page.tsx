import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

type LoginSearchParams = Record<string, string | string[] | undefined>;

interface LoginPageProps {
  searchParams?: LoginSearchParams | Promise<LoginSearchParams>;
}

function getSearchParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const redirectParam = getSearchParamValue(resolvedSearchParams.redirect) ?? "/admin";
  const errorParam = getSearchParamValue(resolvedSearchParams.error);
  const cookieStore = await cookies();
  const existingSession = cookieStore.get(getSessionCookieName());
  if (existingSession) {
    const session = await verifySessionToken(existingSession.value);
    if (session) {
      const target = redirectParam.startsWith("/") ? redirectParam : "/admin";
      redirect(target);
    }
  }

  let errorMessage: string | null = null;
  if (errorParam === "invalid") {
    errorMessage = "Invalid username or password.";
  } else if (errorParam === "missing") {
    errorMessage = "Please provide both username and password.";
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900 text-center">Mooserific Admin</h1>
        <p className="mt-2 text-sm text-[#845A2C] text-center">
          Sign in with your administrator credentials.
        </p>
        {errorMessage ? (
          <div className="mt-4 rounded-[10px] border border-red-900/15 bg-red-900/6 px-3 py-2 text-sm text-red-700/80">
            {errorMessage}
          </div>
        ) : null}
        <form method="post" action="/api/auth/login" className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-900">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="appearance-none w-full rounded-[10px] border border-[#845A2C]/15 bg-white py-2 px-4 text-gray-800 transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#845A2C] focus:ring-2 focus:ring-[#845A2C]/30"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-900">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none w-full rounded-[10px] border border-[#845A2C]/15 bg-white py-2 px-4 text-gray-800 transition-colors placeholder:text-gray-400 focus:outline-none focus:border-[#845A2C] focus:ring-2 focus:ring-[#845A2C]/30"
            />
          </div>
          <input type="hidden" name="redirect" value={redirectParam} />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-[10px] bg-[#845A2C] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d4a24] focus:outline-none focus:ring-2 focus:ring-[#845A2C] focus:ring-offset-2"
          >
            Sign in
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center rounded-[10px] border border-transparent bg-transparent px-3 py-1.5 text-sm text-[#845A2C] transition-colors hover:bg-[#845A2C]/6 focus:outline-none focus:ring-2 focus:ring-[#845A2C] focus:ring-offset-2"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
