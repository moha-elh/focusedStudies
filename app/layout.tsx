import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, supabase } from "@/lib/supabase";
import Feedback from "./feedback";
import NavLinks, { PasteButton } from "./nav-links";
import { LINKS, Mark } from "./ui";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "600"],
});

// TODO(you): point these at your real profiles.
const SOCIALS = [
  ["GitHub", "https://github.com/", "M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z"],
  ["X", "https://x.com/", "M18.2 2.3h3.4l-7.4 8.5 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9L.8 2.3h7l4.8 6.4 5.6-6.4Zm-1.2 18h1.9L7 4.2H5l12 16.1Z"],
  ["YouTube", "https://youtube.com/", "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"],
];

// The link preview image is app/opengraph-image.jpg; on Vercel, Next fills in the site's own URL for it.
export const metadata: Metadata = {
  title: "FocusLearn",
  description: "Watch one video with no distractions, then prove you learned it.",
  twitter: { card: "summary_large_image" },
};

// Anyone can send feedback, signed in or not; the database records who (if anyone) and caps the length.
async function sendFeedback(_prev: "sent" | "error" | null, formData: FormData) {
  "use server";
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  if (!message) return "error";
  const page = String(formData.get("page") ?? "").slice(0, 200);
  const { error } = await (await supabase()).from("feedback").insert({ message, page });
  if (error) console.warn("feedback", error.message);
  return error ? "error" : "sent";
}

async function signOut() {
  "use server";
  await (await supabase()).auth.signOut();
  redirect("/");
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  return (
    // Browser extensions (Grammarly and others) add attributes to <html> and <body> before React loads;
    // ignore those. This only covers these two tags, so real mismatches inside the app are still reported.
    <html lang="en" className={`${bricolage.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans text-base" suppressHydrationWarning>
        {/* Fixed height so the home hero can slide underneath it (see -mt-21 there). */}
        <header className="wrap relative z-10 flex h-21 items-center justify-between gap-4">
          <Link href="/" className="text-xl font-semibold">
            <Mark />
          </Link>
          <NavLinks />
          <div className="flex shrink-0 items-center gap-3">
            <PasteButton />
            {/* Kept smaller than the play button so it does not compete with it. */}
            {user ? (
              <form action={signOut}>
                <button className="inline-flex min-h-9 items-center rounded-full bg-paper px-4 text-sm font-semibold shadow-[0_2px_8px_rgb(26_33_48/0.08)] transition-colors hover:bg-sky">
                  Sign out
                </button>
              </form>
            ) : (
              <Link href="/login" className="btn min-h-9 px-4 text-sm">Sign in</Link>
            )}
          </div>
        </header>

        <div className="flex flex-1 flex-col">{children}</div>
        <Feedback action={sendFeedback} />

        <footer className="mt-32 overflow-hidden bg-night text-night-ink">
          <div className="wrap grid gap-12 pt-20 pb-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="flex flex-col gap-5">
              <Link href="/" className="w-fit text-display font-semibold"><Mark /></Link>
              <p className="max-w-[360px] leading-normal text-night-muted">
                For anyone who wants to remember what they watch, not just finish it.
              </p>
              <ul className="flex gap-3">
                {SOCIALS.map(([label, href, path]) => (
                  <li key={label}>
                    <a href={href} aria-label={label} className="grid size-11 place-items-center rounded-full bg-night-2 transition-colors hover:bg-sun hover:text-ink">
                      <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current"><path d={path} /></svg>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <nav aria-label="Footer">
              <p className="mb-3 text-sm text-night-muted">Product</p>
              <ul>
                {LINKS.map(([label, href]) => (
                  <li key={href}><Link href={href} className="inline-block py-2 transition-colors hover:text-sun">{label}</Link></li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="mb-3 text-sm text-night-muted">Get started</p>
              <ul>
                <li><Link href="/?paste=1#start" className="inline-block py-2 transition-colors hover:text-sun">Paste a link</Link></li>
                {!user && <li><Link href="/login" className="inline-block py-2 transition-colors hover:text-sun">Sign in</Link></li>}
              </ul>
            </div>
          </div>
          <div className="wrap flex flex-wrap justify-between gap-2 border-t border-night-2 py-6 text-sm text-night-muted">
            <span>© 2026 FocusLearn</span>
            <span>Remember what you watch.</span>
          </div>
          {/* Oversized wordmark as a signature, cropped by the page edge. */}
          <p aria-hidden className="wrap -mb-[0.18em] text-hero leading-none font-semibold tracking-tight whitespace-nowrap text-night-2 select-none sm:text-mark">
            FocusLearn
          </p>
        </footer>
      </body>
    </html>
  );
}
