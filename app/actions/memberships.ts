"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type RenewMembershipResult = {
  error: string | null;
};

export async function renewMembership(
  studentId: string,
  monthsToAdd = 1
): Promise<RenewMembershipResult> {
  const supabase = await createClient();

  const fechaInicio = new Date();
  const fechaVencimiento = new Date(fechaInicio);
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + monthsToAdd);

  const payload = {
    student_id: studentId,
    estado: "activa" as const,
    fecha_inicio: fechaInicio.toISOString().slice(0, 10),
    fecha_vencimiento: fechaVencimiento.toISOString().slice(0, 10),
    created_at: fechaInicio.toISOString(),
  };

  const { data: existing, error: findError } = await supabase
    .from("memberships")
    .select("id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    return { error: `No se pudo verificar la membresia: ${findError.message}` };
  }

  const { error: writeError } = existing
    ? await supabase.from("memberships").update(payload).eq("id", existing.id)
    : await supabase.from("memberships").insert(payload);

  if (writeError) {
    return { error: `No se pudo registrar el pago: ${writeError.message}` };
  }

  revalidatePath("/");

  return { error: null };
}
