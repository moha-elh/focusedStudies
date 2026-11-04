"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addFolder, deleteSession, setFolder } from "@/lib/db";

const folderName = (form: FormData) => String(form.get("folder") ?? "").trim().replace(/\s+/g, " ").slice(0, 40) || null;

// An empty name takes the video out of its folder.
export async function moveSession(id: string, form: FormData) {
  await setFolder([id], folderName(form));
  revalidatePath("/library");
}

// Picking videos is optional: an empty folder waits in the folders table.
export async function createFolder(form: FormData) {
  const name = folderName(form);
  if (!name) return;
  await addFolder(name);
  await setFolder(form.getAll("ids").map(String).slice(0, 500), name);
  revalidatePath("/library");
}

export async function removeSession(id: string) {
  await deleteSession(id);
  revalidatePath("/library");
  redirect("/library");
}
