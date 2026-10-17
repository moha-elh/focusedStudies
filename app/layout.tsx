import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
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

export const metadata: Metadata = {
  title: "FocusLearn",
  description: "Watch one video with no distractions, then prove you learned it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
          <PasteButton />
        </header>

        <div className="flex flex-1 flex-col">{children}</div>

        <footer className="wrap mt-32 pb-6">
          <div className="reveal flex flex-col items-center gap-10 rounded-[32px] bg-night px-6 pt-16 pb-8 text-center text-night-ink sm:px-10">
            <div className="text-hero font-semibold sm:text-mark">
              <Mark />
            </div>
            <p className="max-w-[420px] text-xl leading-[1.4] text-night-muted">
              For anyone who wants to remember what they watch, not just finish it.
            </p>
            <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              {LINKS.map(([label, href]) => (
                <Link key={href} href={href} className="py-3 transition-colors hover:text-sun">{label}</Link>
              ))}
            </nav>
            <ul className="flex gap-3">
              {SOCIALS.map(([label, href, path]) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="grid size-12 place-items-center rounded-full bg-night-2 transition duration-300 hover:-translate-y-1 hover:bg-sun hover:text-ink"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current"><path d={path} /></svg>
                  </a>
                </li>
              ))}
            </ul>
            <div className="w-full border-t border-night-2 pt-6 text-sm text-night-muted">© 2026 FocusLearn</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
