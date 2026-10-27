// Run: node --experimental-strip-types lib/db.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSessions, saveSession } from "./db.ts";

process.chdir(mkdtempSync(join(tmpdir(), "focuslearn-")));
assert.deepEqual(await listSessions(), []); // no file yet
await saveSession({ video_id: "a", title: null, recap: "r", feedback: null, notes: [] });
assert.equal((await listSessions()).length, 1);

// A corrupt file must throw, not read as empty, or the next save would wipe the library.
writeFileSync("data/sessions.json", "[{");
await assert.rejects(listSessions());
await assert.rejects(saveSession({ video_id: "b", title: null, recap: "r", feedback: null, notes: [] }));
console.log("ok");
