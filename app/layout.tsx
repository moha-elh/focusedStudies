import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { Fragment } from "react";
import { Mark } from "./ui";
import "./globals.css";

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FocusLearn",
  description: "Watch one video with no distractions, then prove you learned it.",
};

const LINKS = [
  ["Watch", "/"],
  ["Process", "/#process"],
  ["Library", "/library"],
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions (Grammarly and others) add attributes to <html> and <body> before React loads;
    // ignore those. This only covers these two tags, so real mismatches inside the app are still reported.
    <html lang="en" className={`${instrument.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans text-base" suppressHydrationWarning>
        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-3 sm:px-5">
          <nav className="flex items-center gap-6 py-5 text-sm">
            <Link href="/" className="mr-auto text-xl font-medium">
              <Mark />
            </Link>
            <div className="flex items-center gap-4 sm:gap-8">
              {LINKS.map(([label, href], i) => (
                <Fragment key={href}>
                  {i > 0 && <span aria-hidden className="hidden text-muted sm:inline">+</span>}
                  <Link href={href} className="transition-colors hover:text-muted">{label}</Link>
                </Fragment>
              ))}
            </div>
          </nav>

          {children}

          <footer className="mt-24 mb-3 flex flex-col gap-12 overflow-hidden rounded-hero bg-night p-6 text-night-ink sm:mb-5 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <Mark className="text-hero font-medium sm:text-mark" />
              <span className="text-xl">© 2026</span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-8 text-sm">
              <p className="max-w-xs text-night-ink/60">
                For anyone who wants to remember what they watch, not just finish it.
              </p>
              <div className="flex gap-12">
                <div className="flex flex-col gap-1">
                  <span className="text-night-ink/50">Navigate</span>
                  {LINKS.map(([label, href]) => (
                    <Link key={href} href={href} className="transition-colors hover:text-night-ink/60">{label}</Link>
                  ))}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-night-ink/50">Photo</span>
                  <a href="https://unsplash.com/photos/JV8f9yOVoss" className="transition-colors hover:text-night-ink/60">
                    Ed Wingate / Unsplash
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
