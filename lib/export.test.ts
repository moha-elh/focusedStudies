import assert from "node:assert/strict";
import { toMarkdown } from "./export.ts";

const base = { id: "x", video_id: "abcdefghijk", title: "Talk", recap: "My recap ", created_at: "" };
const md = toMarkdown({
  ...base,
  notes: [{ t: 222, text: "key idea" }],
  feedback: { score: 70, summary: "Good.", covered: [{ text: "A", t: 30 }, "old string point"], missed: [], incorrect: [] },
});
assert.ok(md.startsWith("# Talk\n"));
assert.ok(md.includes("- A ([0:30](https://youtu.be/abcdefghijk?t=30))"));
assert.ok(md.includes("- old string point\n"));
assert.ok(!md.includes("## You missed"));
assert.ok(md.includes("- [3:42](https://youtu.be/abcdefghijk?t=222) key idea"));
assert.ok(md.endsWith("## Your recap\n\nMy recap\n"));
// Failed grading: no feedback section, recap still exported.
assert.ok(!toMarkdown({ ...base, feedback: { error: "No captions" } }).includes("Score"));
console.log("ok");
