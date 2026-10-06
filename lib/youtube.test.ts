// Run: node --experimental-strip-types lib/youtube.test.ts
import assert from "node:assert";
import { fmtTime, parseVideoId, timestampedTranscript } from "./youtube.ts";

assert.equal(fmtTime(0), "0:00");
assert.equal(fmtTime(222.9), "3:42");
assert.equal(fmtTime(3725), "1:02:05");

// ms offsets (srv3) and second offsets (classic) produce the same blocks
const ms = [{ text: "a", offset: 1000 }, { text: "b", offset: 20000 }, { text: "c", offset: 45000 }];
const sec = [{ text: "a", offset: 1.0 }, { text: "b", offset: 20.5 }, { text: "c", offset: 45.2 }];
assert.equal(timestampedTranscript(ms), "[0:01] a b\n[0:45] c");
assert.equal(timestampedTranscript(sec), "[0:01] a b\n[0:45] c");

const id = "dQw4w9WgXcQ";
for (const link of [
  id,
  `https://www.youtube.com/watch?v=${id}&t=42s`,
  `https://youtu.be/${id}?si=abc`,
  `https://m.youtube.com/watch?v=${id}`,
  `https://youtube.com/shorts/${id}`,
  `https://www.youtube.com/embed/${id}`,
]) assert.equal(parseVideoId(link), id, link);

for (const bad of ["", "hello", "https://vimeo.com/123", `https://evil.com/watch?v=${id}`, "https://youtube.com/watch?v=short"])
  assert.equal(parseVideoId(bad), null, bad);

console.log("ok");
