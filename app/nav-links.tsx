"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Burst } from "./hero-cta";
import { LINKS } from "./ui";

// Main nav; the current page gets a sun-colored underline.
export default function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-1 items-center justify-center gap-5 sm:gap-7">
      {LINKS.map(([label, href]) => {
        const on = href === "/" ? path === "/" : href !== "/#process" && path.startsWith(href);
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
    else document.querySelector<HTMLInputElement>("#start input[name=url]")?.focus();
  }
  return (
    <Link href="/?paste=1#start" onClick={onClick} aria-label="Paste a link" className="burst relative grid size-12 shrink-0 place-items-center">
      <Burst icon="size-5 -translate-x-[2%]" />
    </Link>
  );
}
