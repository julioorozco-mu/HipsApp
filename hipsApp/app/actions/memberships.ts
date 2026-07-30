"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type RenewMembershipResult = {
  error: string | null;
};

export async function renewMembership(
  studentId: string
): Promise<RenewMembershipResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Inicia sesión para registrar el pago." };
  }

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("id")
    .eq("kind", "mensual")
    .eq("active", true)
    .single();

  if (planError) {
    return { error: `No se encontró el plan mensual: ${planError.message}` };
  }

  const { error } = await supabase.rpc("register_membership_payment", {
    p_method: "efectivo",
    p_plan_id: plan.id,
    p_student_id: studentId,
  });

  if (error) {
    return { error: `No se pudo registrar el pago: ${error.message}` };
  }

  revalidatePath("/");
  revalidatePath("/asistencia");

  return { error: null };
}
