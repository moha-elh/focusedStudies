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
- **One entry per video:** re-watching a video pre-fills your earlier recap and notes; submitting updates the same entry and re-grades it.

## Run
1. `npm install`
2. `npm run dev` → http://localhost:3000
3. Optional: create `.env.local` with `ANTHROPIC_API_KEY=...` for real grading. Without it, you get clearly labelled demo feedback.

Test: `node --experimental-strip-types lib/youtube.test.ts`

## Tech
Next.js 16 (App Router), Tailwind CSS 4, Claude API (`@anthropic-ai/sdk`), `youtube-transcript`.
Data is stored locally in `data/sessions.json`. There are no accounts yet.

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

**P0: left for last (blocks local testing)**
- [ ] Accounts + cloud database (Supabase)
- [ ] Deploy (Vercel) + reliable transcripts in production (paid transcript API fallback)

**P1**
- [ ] Score history per video (show improvement across revisits)
- [ ] Browser extension: "Open in FocusLearn" button on YouTube

**P2**
- [ ] Playlists (group videos into a learning path)
- [ ] Voice recap (speak instead of type)
- [ ] Teacher share links
- [ ] Multi-language transcripts and feedback
- [ ] Payments

Not planned: quizzes, flashcards, spaced repetition. FocusLearn is a focused watching + recall tool, not a study app.
