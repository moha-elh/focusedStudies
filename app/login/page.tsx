import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { supabase } from "@/lib/supabase";
import StartButton from "../start-button";
import { Label } from "../ui";

async function sendLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(formData.get("next"));
  // Server actions only accept same-origin requests, so this is our own site's origin.
  const origin = (await headers()).get("origin");
  const { error } = await (await supabase()).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) console.warn("login", error.message);
  redirect(error ? `/login?error=send&next=${encodeURIComponent(next)}` : `/login?sent=${encodeURIComponent(email)}`);
}

const ERRORS: Record<string, string> = {
  send: "Couldn't send the link. Check the address, or wait a minute and try again.",
  link: "That sign-in link has expired or was already used. Send yourself a new one.",
};

type Props = { searchParams: Promise<{ next?: string; sent?: string; error?: string }> };

export default async function Login({ searchParams }: Props) {
  const { next, sent, error } = await searchParams;

  return (
    <main className="wrap flex flex-1 items-center justify-center py-16">
      <section className="rise flex w-full max-w-[520px] flex-col gap-6 rounded-[32px] bg-paper p-6 sm:p-10">
        <Label>Sign in</Label>
        {sent ? (
          <>
            <h1 className="text-display font-semibold">Check your inbox.</h1>
            <p className="text-xl leading-normal break-words text-muted">
              We sent a sign-in link to <span className="text-ink">{sent}</span>. Open it in this browser to continue.
            </p>
            <Link href="/login" className="w-fit py-3 text-sm text-muted transition-colors hover:text-ink">Use a different email</Link>
          </>
        ) : (
          <>
            <h1 className="text-display font-semibold">Your library, on every device.</h1>
            <p className="leading-normal text-muted">
              Enter your email and we&apos;ll send you a link to sign in. No password to remember.
            </p>
            {error && ERRORS[error] && <p role="alert" className="rounded-panel bg-bad-soft px-5 py-4 text-bad">{ERRORS[error]}</p>}
            <form action={sendLink} className="flex flex-wrap gap-1.5 rounded-[32px] border border-line bg-white p-1.5 focus-within:border-ink">
              <input type="hidden" name="next" value={safeNext(next)} />
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                aria-label="Email"
                placeholder="you@example.com"
                className="min-h-12 min-w-0 flex-[1_1_200px] rounded-full bg-transparent px-5 outline-none placeholder:text-muted"
              />
              <StartButton idle="Send link ↗" pending="Sending…" />
            </form>
          </>
        )}
      </section>
    </main>
  );
}
