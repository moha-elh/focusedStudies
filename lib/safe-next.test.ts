// Run: node --experimental-strip-types lib/safe-next.test.ts
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

assert.equal(safeNext("/watch/abcdefghijk?t=42"), "/watch/abcdefghijk?t=42");
// Anything that could leave the site falls back to the library.
for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"]) assert.equal(safeNext(bad), "/library", String(bad));
console.log("ok");
