// Run: node --experimental-strip-types lib/youtube.test.ts
import assert from "node:assert";
import { parseVideoId } from "./youtube.ts";

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
