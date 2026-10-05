# FocusLearn

Paste a YouTube link, watch it with no distractions, then explain what you learned. Claude grades your recap against the transcript. Everything is saved in your library.

**Local mode:** no accounts yet. Sessions are saved to `data/sessions.json`. Without `ANTHROPIC_API_KEY` the app shows labelled demo feedback.

## Run
1. `npm run dev` → http://localhost:3000
2. Optional: put `ANTHROPIC_API_KEY=...` in `.env.local` for real grading.

Test: `node --experimental-strip-types lib/youtube.test.ts`
