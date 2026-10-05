> **Status: 🚧 In progress**

# FocusLearn

Paste a YouTube link, watch it with no distractions, then explain what you learned. Claude compares your recap with the video's transcript and tells you what you got right, missed, or got wrong. Everything is saved in your library.

## Features
- **Focus player:** just the video, no recommendations, comments or autoplay.
- **Recall:** when the video ends (or you click "I'm done watching"), write what you learned from memory, with guiding questions if you're stuck.
- **AI feedback:** a score out of 100, a short summary, and three lists: got right, missed, not quite right.
- **Library:** every video you've watched, with your notes, score and date.
- **One entry per video:** re-watching a video pre-fills your earlier notes; submitting updates the same entry and re-grades it.

## Run
1. `npm install`
2. `npm run dev` → http://localhost:3000
3. Optional: create `.env.local` with `ANTHROPIC_API_KEY=...` for real grading. Without it, you get clearly labelled demo feedback.

Test: `node --experimental-strip-types lib/youtube.test.ts`

## Tech
Next.js 16 (App Router), Tailwind CSS 4, Claude API (`@anthropic-ai/sdk`), `youtube-transcript`.
Data is stored locally in `data/sessions.json`. There are no accounts yet.

## Roadmap
- [x] Focus player, recap, AI feedback, library
- [x] Redesign following the global design rules
- [x] One entry per video (update notes instead of duplicating)
- [ ] Accounts + database (Supabase)
- [ ] Deploy (Vercel); check transcript fetching works from the server
- [ ] Spaced-repetition reminders to review past videos
- [ ] Payments
