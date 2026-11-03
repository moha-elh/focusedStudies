"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Burst } from "./hero-cta";
import { LINKS } from "./ui";

// Main nav; the current page gets a sun-colored underline.
export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 items-center justify-center gap-5 sm:gap-7">
      {LINKS.map(([label, href, section]) => {
        if (section)
          return (
            <SectionLink key={label} section={section} className="px-1 py-3 transition-colors hover:text-link">
              {label}
            </SectionLink>
          );
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`px-1 py-3 transition-colors hover:text-link ${on ? "shadow-[inset_0_-3px_0_var(--color-sun)]" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

// A link to a section of the home page, with no #fragment in the URL. A #fragment link does nothing when clicked a
// second time (the URL doesn't change, so the browser doesn't scroll again). On the home page this scrolls every time
// (smoothly, per the html scroll-behavior); elsewhere it opens home and ScrollToSection finishes the job there.
export function SectionLink({ section, className, children }: { section: string; className?: string; children: React.ReactNode }) {
  const path = usePathname();
  function onClick(e: React.MouseEvent) {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab or window: just open home
    if (path !== "/") return sessionStorage.setItem("scroll-to", section); // the Link then opens home
    e.preventDefault();
    document.getElementById(section)?.scrollIntoView();
  }
  return (
    <Link href="/" onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

// Mounted on the home page: scrolls to the section a SectionLink on another page asked for.
export function ScrollToSection() {
  useEffect(() => {
    const section = sessionStorage.getItem("scroll-to");
    if (!section) return;
    sessionStorage.removeItem("scroll-to");
    // After Next.js has scrolled the new page to the top.
    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
  }, []);
  return null;
}

// Nav CTA, a small twin of the hero starburst. On the home page it scrolls up and presses the hero button
// (or focuses the link field if it's already open); elsewhere it opens home with the form ready.
export function PasteButton() {
  const path = usePathname();
  function onClick(e: React.MouseEvent) {
    if (path !== "/") return;
    e.preventDefault();
    window.scrollTo({ top: 0 });
    const hero = document.getElementById("hero-play");
    if (hero) hero.click();
    else document.querySelector<HTMLInputElement>("#start input[name=url]")?.focus(); // a selector, not a URL
  }
  return (
    <Link href="/?paste=1" onClick={onClick} aria-label="Paste a link" className="burst relative grid size-12 shrink-0 place-items-center">
      <Burst icon="size-5 -translate-x-[2%]" />
    </Link>
  );
}
