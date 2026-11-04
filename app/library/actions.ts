"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteSession, setFolder } from "@/lib/db";

// An empty name takes the video out of its folder.
export async function moveSession(id: string, form: FormData) {
  const name = String(form.get("folder") ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  await setFolder(id, name || null);
  revalidatePath("/library");
}

export async function removeSession(id: string) {
  await deleteSession(id);
  revalidatePath("/library");
  redirect("/library");
}
