"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function setMessageQueueState(formData: FormData) {
  const batchId = String(formData.get("batchId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!batchId || !["pausado", "procesando"].includes(nextStatus)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("message_batches")
    .update({
      status: nextStatus as "pausado" | "procesando",
      started_at: nextStatus === "procesando" ? new Date().toISOString() : undefined,
    })
    .eq("id", batchId)
    .eq("status", nextStatus === "pausado" ? "procesando" : "pausado");

  if (error) throw new Error(`No se pudo actualizar la cola: ${error.message}`);

  revalidatePath("/mensajes");
}
