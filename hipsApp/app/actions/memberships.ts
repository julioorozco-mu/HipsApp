"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type RenewMembershipResult = {
  error: string | null;
};

export type RegisterPaymentState = {
  error: string | null;
};

const paymentMethods = new Set(["efectivo", "transferencia", "tarjeta"]);

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
  revalidatePath("/membresias");
  revalidatePath(`/alumnos/${studentId}`);

  return { error: null };
}

export async function registerPayment(
  _state: RegisterPaymentState,
  formData: FormData
): Promise<RegisterPaymentState> {
  const studentId = formData.get("studentId");
  const planId = formData.get("planId");
  const method = formData.get("method");
  const amount = Number(formData.get("amount"));

  if (
    typeof studentId !== "string" ||
    typeof planId !== "string" ||
    typeof method !== "string" ||
    !paymentMethods.has(method) ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return { error: "Revisa los datos del pago." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Inicia sesión para registrar el pago." };

  const { data: plan, error: planError } = await supabase
    .from("membership_plans")
    .select("price")
    .eq("id", planId)
    .eq("active", true)
    .single();

  if (planError || Number(plan.price) !== amount) {
    return { error: "El monto no coincide con el plan seleccionado." };
  }

  const { error } = await supabase.rpc("register_membership_payment", {
    p_method: method as "efectivo" | "transferencia" | "tarjeta",
    p_plan_id: planId,
    p_student_id: studentId,
  });

  if (error) return { error: `No se pudo registrar el pago: ${error.message}` };

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/membresias");
  revalidatePath(`/alumnos/${studentId}`);
  redirect(`/alumnos/${studentId}`);
}
