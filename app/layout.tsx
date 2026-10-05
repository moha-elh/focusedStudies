import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FocusLearn",
  description: "Watch one video with no distractions, then prove you learned it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-base">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 border-b border-line px-4 py-4 text-sm text-muted sm:px-6">
          <Link href="/" className="mr-auto text-base font-semibold text-ink">
            Focus<span className="text-accent">Learn</span>
          </Link>
          <Link href="/" className="transition-colors hover:text-ink">New video</Link>
          <Link href="/library" className="transition-colors hover:text-ink">Library</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
