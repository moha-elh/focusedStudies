// `npm run dev:local`: the app against the Supabase running in Docker on this machine, never production.
// Values set here win over .env.local (Next.js doesn't override variables that are already set).
import { spawn } from "node:child_process";

process.loadEnvFile(".env.supabase-local");
process.env.NEXT_DIST_DIR = ".next-local";
spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], { stdio: "inherit" }).on("exit", (code) => process.exit(code ?? 0));
