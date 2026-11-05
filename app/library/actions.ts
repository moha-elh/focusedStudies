"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addFolder, deleteSession, setFolder, setFolderColor } from "@/lib/db";
import { isFolderColor } from "./colors";

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
  const color = form.get("color");
  await addFolder(name, isFolderColor(color) && color !== "blue" ? color : null);
  await setFolder(form.getAll("ids").map(String).slice(0, 500), name);
  revalidatePath("/library");
}

export async function recolorFolder(name: string, form: FormData) {
  const color = form.get("color");
  if (!isFolderColor(color)) return;
  await setFolderColor(name, color === "blue" ? null : color);
  revalidatePath("/library");
}

export async function removeSession(id: string) {
  await deleteSession(id);
  revalidatePath("/library");
  redirect("/library");
}
