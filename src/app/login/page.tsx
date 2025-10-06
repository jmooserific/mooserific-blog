import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSessionCookieName,
  verifySessionToken,
} from "@/lib/auth";

interface LoginPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function getSearchParamValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const redirectParam = getSearchParamValue(searchParams.redirect) ?? "/admin";
  const errorParam = getSearchParamValue(searchParams.error);
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
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-white text-center">Mooserific Admin</h1>
        <p className="mt-2 text-sm text-slate-200 text-center">
          Sign in with your administrator credentials.
        </p>
        {errorMessage ? (
          <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}
        <form method="post" action="/api/auth/login" className="mt-6 space-y-5">
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-slate-200">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="block w-full rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-200">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-lg border border-white/20 bg-slate-900/60 px-4 py-2 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
            />
          </div>
          <input type="hidden" name="redirect" value={redirectParam} />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Sign in
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-300 hover:text-white transition">
            ← Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
