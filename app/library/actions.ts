"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/db";

export async function removeSession(id: string) {
  await deleteSession(id);
  revalidatePath("/library");
  redirect("/library");
}
