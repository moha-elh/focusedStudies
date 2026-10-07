import { getSession } from "@/lib/db";
import { toMarkdown } from "@/lib/export";

export async function GET(_req: Request, ctx: RouteContext<"/library/[id]/markdown">) {
  const s = await getSession((await ctx.params).id);
  if (!s) return new Response("Not found", { status: 404 });
  const name = (s.title ?? s.video_id).replace(/[^\w -]+/g, "").trim().slice(0, 80) || s.video_id;
  return new Response(toMarkdown(s), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.md"`,
    },
  });
}
