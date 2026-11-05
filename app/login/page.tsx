import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siGithub, siGoogle } from "simple-icons";
import { safeNext } from "@/lib/safe-next";
import { cookies } from "next/headers";
import { LOCAL_SUPABASE, STAY_SIGNED_OUT, supabase, TEST_USER } from "@/lib/supabase";
import { Label } from "../ui";

// Kept out of search: just two sign-in buttons, and every ?next= link would be another copy of it. Links are still followed.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to FocusLearn with Google or GitHub to keep your notes, recaps and feedback in your library.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

const PROVIDERS = [
  { id: "google", name: "Google", icon: siGoogle },
  { id: "github", name: "GitHub", icon: siGithub },
] as const;

// Sign-in goes through Google or GitHub (via Supabase), so no emails are sent and there's no email rate limit.
async function signIn(formData: FormData) {
  "use server";
  const provider = PROVIDERS.find((p) => p.id === formData.get("provider"))?.id;
  if (!provider) redirect("/login");
  const next = safeNext(formData.get("next"));
  // Server actions only accept same-origin requests, so this is our own site's origin.
  const origin = (await headers()).get("origin");
  const { data, error } = await (await supabase()).auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) console.warn("login", error.message);
  redirect(error ? `/login?error=send&next=${encodeURIComponent(next)}` : data.url);
}

// Local testing only: signs in with the seeded account (supabase/seed.sql) instead of Google/GitHub.
async function testSignIn(formData: FormData) {
  "use server";
  if (!LOCAL_SUPABASE) redirect("/login");
  const next = safeNext(formData.get("next"));
  const { error } = await (await supabase()).auth.signInWithPassword({ email: String(formData.get("email")), password: String(formData.get("password")) });
  if (!error) (await cookies()).delete(STAY_SIGNED_OUT);
  redirect(error ? `/login?error=test&next=${encodeURIComponent(next)}` : next);
}

const ERRORS: Record<string, string> = {
  test: "Wrong test email or password. Run npm run db:reset to recreate the test account.",
  send: "Couldn't start sign-in. Please try again.",
  link: "Sign-in didn't finish. Please try again.",
};

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function Login({ searchParams }: Props) {
  const { next, error } = await searchParams;

  return (
    <main className="wrap flex flex-1 items-center justify-center py-16">
      <section className="rise flex w-full max-w-[520px] flex-col gap-6 rounded-[32px] bg-paper p-6 sm:p-10">
        <Label>Sign in</Label>
        <h1 className="text-display font-semibold">Your library, on every device.</h1>
        <p className="leading-normal text-muted">Sign in with an account you already have. No password to remember.</p>
        {error && ERRORS[error] && <p role="alert" className="rounded-panel bg-bad-soft px-5 py-4 text-bad">{ERRORS[error]}</p>}
        <form action={signIn} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={safeNext(next)} />
          {PROVIDERS.map((p) => (
            <button key={p.id} name="provider" value={p.id} className="btn-outline min-h-12 justify-center gap-3">
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0 fill-current"><path d={p.icon.path} /></svg>
              Continue with {p.name}
            </button>
          ))}
        </form>
        {LOCAL_SUPABASE && (
          <form action={testSignIn} className="flex flex-col gap-3 border-t border-line pt-6">
            <p className="text-sm text-muted">Local test account (only on your machine)</p>
            <input type="hidden" name="next" value={safeNext(next)} />
            <input name="email" type="email" defaultValue={TEST_USER.email} aria-label="Email" className="min-h-12 rounded-full border border-line bg-white px-4 outline-none focus:border-ink" />
            <input name="password" type="password" defaultValue={TEST_USER.password} aria-label="Password" className="min-h-12 rounded-full border border-line bg-white px-4 outline-none focus:border-ink" />
            <button className="btn justify-center">Sign in as test user</button>
          </form>
        )}
      </section>
    </main>
  );
}
