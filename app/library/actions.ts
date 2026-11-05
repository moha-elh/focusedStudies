"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addFolder, deleteSession, setFolder, setFolderColor } from "@/lib/db";
import { pickedColor } from "./colors";

const folderName = (form: FormData) => String(form.get("folder") ?? "").trim().replace(/\s+/g, " ").slice(0, 40) || null;

// An empty name takes the video out of its folder.
export async function moveSession(id: string, form: FormData) {
  const name = folderName(form);
  // Typed a new folder (the form with a color choice): give it that color. An existing folder keeps its own.
  if (name && form.has("color")) await addFolder(name, pickedColor(form));
  await setFolder([id], name);
  revalidatePath("/library");
}

// Picking videos is optional: an empty folder waits in the folders table.
export async function createFolder(form: FormData) {
  const name = folderName(form);
  if (!name) return;
  await addFolder(name, pickedColor(form));
  await setFolder(form.getAll("ids").map(String).slice(0, 500), name);
  revalidatePath("/library");
}

export async function recolorFolder(name: string, form: FormData) {
  await setFolderColor(name, pickedColor(form));
  revalidatePath("/library");
}

export async function removeSession(id: string) {
  await deleteSession(id);
  revalidatePath("/library");
  redirect("/library");
}
