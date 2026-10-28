import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · FocusLearn" };

const SECTIONS: [string, string][] = [
  ["What we collect", "When you sign in with Google or GitHub, we receive your name, email address and profile picture. When you use FocusLearn, we save the videos you watch, your notes, your recaps and the feedback you get. If you use the Feedback button, we save your message and the page you sent it from."],
  ["How we use it", "Only to run FocusLearn: to sign you in, keep your library, and grade your recaps. We don't sell your data, show ads, or use it to track you across other sites."],
  ["Who else sees it", "Your data is stored with Supabase (database and sign-in) and the site is hosted on Vercel. To grade a recap, your recap and the video's transcript are sent to an AI provider (Groq). Videos play through YouTube's embedded player, and sponsor segments are looked up on SponsorBlock using only the video's ID."],
  ["Your choices", "Your library is private to your account. To delete your account and everything in it, send a request with the Feedback button and include the email you signed in with; we'll delete it."],
  ["Changes", "If this policy changes, the updated version will be posted on this page."],
];

export default function Privacy() {
  return (
    <main className="wrap flex flex-col gap-10 py-16">
      <h1 className="text-display font-semibold">Privacy</h1>
      <div className="flex max-w-[680px] flex-col gap-8">
        {SECTIONS.map(([title, body]) => (
          <section key={title} className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="leading-normal text-muted">{body}</p>
          </section>
        ))}
        <p className="text-sm text-muted">Last updated October 28, 2026.</p>
      </div>
    </main>
  );
}
