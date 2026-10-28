> **Status: 🚧 In progress**

# FocusLearn

Paste a YouTube link, watch it with no distractions, then explain what you learned. Claude compares your recap with the video's transcript and tells you what you got right, missed, or got wrong. Everything is saved in your library.

## Features
- **Focus player:** just the video, no recommendations, comments or autoplay.
- **Recall:** when the video ends (or you click "I'm done watching"), write what you learned from memory, with guiding questions if you're stuck.
- **AI feedback:** a score out of 100, a short summary, and three lists: got right, missed, not quite right.
- **Library:** every video you've watched, with your notes, score and date.
- **Notes while watching:** each note is stamped with the video time; click a time to jump back. Unsent notes and recap survive a refresh.
- **Jump to the moment:** every point in the feedback links to where the video covers it.
- **Sponsor skipping:** sponsor, self-promo and "like and subscribe" segments are skipped automatically, using SponsorBlock's community data.
- **Export:** download any session as Markdown, or copy it and paste into Notion.
- **Browser extension:** an "Open in FocusLearn" button on every YouTube video (see below).
- **One entry per video:** re-watching a video pre-fills your earlier recap and notes; submitting updates the same entry and re-grades it.

## Run
1. `npm install`
2. `npm run dev` → http://localhost:3000
3. Optional: create `.env.local` with `GROQ_API_KEY=...` (console.groq.com, free tier) or `ANTHROPIC_API_KEY=...` for real grading; Groq wins if both are set. Without it, you get clearly labelled demo feedback.
4. Optional, cloud database: create a Supabase project, run `supabase/schema.sql` in its SQL Editor, then add `SUPABASE_URL` (Project Settings → Data API → Project URL) and `SUPABASE_SECRET_KEY` (Project Settings → API keys → secret key; the publishable key is not needed) to `.env.local`. Without them, sessions are saved in `data/sessions.json`. To move existing local sessions over: `node --env-file=.env.local --experimental-strip-types scripts/import-sessions.ts`

Test: `node --experimental-strip-types lib/youtube.test.ts && node --experimental-strip-types lib/export.test.ts && node --experimental-strip-types lib/db.test.ts`

### Browser extension
1. Open `chrome://extensions` (or `edge://extensions`) and turn on Developer mode.
2. Click "Load unpacked" and pick the `extension` folder.
3. Pin the FocusLearn icon from the puzzle-piece menu. On a YouTube video, click it: a popup shows the video and the moment you're at, and "Open in FocusLearn" pauses YouTube and continues there. Anywhere else it says no video was detected. Video pages also get an "Open in FocusLearn" button in the bottom-right corner (refresh tabs that were open before installing).

FocusLearn has to be running (`npm run dev`). Don't use "Pack extension"; it isn't needed. After changing the extension's files, click the reload arrow on its card in the extensions page.
It points to `http://localhost:3000`; change `FOCUSLEARN` in `extension/shared.js` after deploying.

## Tech
Next.js 16 (App Router), Tailwind CSS 4, Groq (`openai/gpt-oss-120b`) or Claude API (`@anthropic-ai/sdk`), Supabase, `youtube-transcript`.
Data is stored in Supabase (Postgres) when configured, otherwise locally in `data/sessions.json`. There are no accounts yet.

## Roadmap

Done
- [x] Focus player, recap, AI feedback, library
- [x] One entry per video (update notes instead of duplicating)
- [x] Light editorial redesign (Lumóra-inspired), following the global design rules
- [x] Timestamped notes while watching
- [x] "Jump to" timestamps on feedback points
- [x] Clear demo-mode notice when no API key is set
- [x] Sponsor-segment skipping (SponsorBlock)
- [x] Export notes (Markdown download, copy for Notion)
- [x] Browser extension: "Open in FocusLearn" button on YouTube

**P0: left for last (blocks local testing)**
- [x] Cloud database (Supabase)
- [ ] Accounts (Supabase Auth, one library per user)
- [ ] Deploy (Vercel) + reliable transcripts in production (paid transcript API fallback)

**P1**
- [ ] Score history per video (show improvement across revisits)

**P2**
- [ ] Playlists (group videos into a learning path)
- [ ] Voice recap (speak instead of type)
- [ ] Teacher share links
- [ ] Multi-language transcripts and feedback
- [ ] Payments

Not planned: quizzes, flashcards, spaced repetition. FocusLearn is a focused watching + recall tool, not a study app.
