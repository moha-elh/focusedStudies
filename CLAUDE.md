@AGENTS.md

# Shipping new features: admin preview on production first

Don't test new user-facing features only locally. Ship them to production for admins first:

1. Put the feature behind `isAdmin()` from `lib/db.ts` (by convention a `preview` flag in the page, passed down as a prop). Everyone else keeps the current behavior.
2. Work on a `feat/*`, `fix/*` or `style/*` branch, merge it into `dev`, then merge `dev` into `main` with a `Release: … (admin preview)` commit. Pushing `main` deploys to production.
3. Once the admin has tried it on the live site, remove the gate in a later release ("… for everyone").

Changes users can't see (speed, data trimming, refactors) don't need a gate. Neither do file conventions that can't check the user, like `loading.tsx`.

# Commits: one change each

Give every change its own commit: one feature, one fix, one style tweak, one speed-up each, with a message that names just that change (`feat:`, `fix:`, `perf:`, `style:`, `docs:`). Don't bundle unrelated changes into one commit, even when they ship in the same release. A release is the merge of `dev` into `main`, not a commit that holds everything.

# No AI trace on GitHub

Commits, merge messages, branch names and PR text carry no sign of the AI that helped write them: no `Co-Authored-By: Claude` trailer, no "Generated with Claude Code" line, no mention of Claude or an AI. Commits are authored as the repo's git user only.
