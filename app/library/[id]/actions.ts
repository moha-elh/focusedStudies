"use server";

import { revalidatePath } from "next/cache";
import { getSession, isAdmin, saveSession } from "@/lib/db";
import { grade } from "@/lib/grade";

// Grades the saved recap again, for when the first try couldn't get the captions or the grader failed.
export async function regrade(id: string) {
  if (!(await isAdmin())) return; // admin-only preview for now, like the button
  const s = await getSession(id);
  if (!s?.recap) return;
  const { title, feedback } = await grade(s.video_id, s.recap);
  await saveSession({ video_id: s.video_id, title, recap: s.recap, feedback, notes: s.notes ?? [] });
  revalidatePath(`/library/${id}`);
  revalidatePath("/library");
}
