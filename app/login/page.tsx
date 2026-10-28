import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siGithub, siGoogle } from "simple-icons";
import { safeNext } from "@/lib/safe-next";
import { supabase } from "@/lib/supabase";
import { Label } from "../ui";

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

const ERRORS: Record<string, string> = {
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
      </section>
    </main>
  );
}
