// `npm run dev`: the app against the Supabase running in Docker on this machine, never production.
// Values set here win over .env.local (Next.js doesn't override variables that are already set). Next runs in this
// same process, so stopping this script stops the server too.
process.loadEnvFile(".env.supabase-local");
process.env.NEXT_DIST_DIR = ".next-local";
process.argv.splice(2, 0, "dev");
await import("next/dist/bin/next");
