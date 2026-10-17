"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button onClick={copy} className="btn-outline">
      {state === "copied" ? "Copied, paste into Notion" : state === "failed" ? "Couldn't copy, use Download" : "Copy for Notion"}
    </button>
  );
}
