"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isPaymentMethod } from "@/lib/payment";

export type RenewMembershipResult = {
  error: string | null;
};

export type ConfirmPaymentState = {
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
  revalidatePath("/membresias");
  revalidatePath(`/alumnos/${studentId}`);

  return { error: null };
}

export async function confirmPayment(
  _state: ConfirmPaymentState,
  formData: FormData
): Promise<ConfirmPaymentState> {
  const studentId = formData.get("studentId");
  const planId = formData.get("planId");
  const method = formData.get("method");
  const amountReceived = Number(formData.get("amount"));
  const reference = String(formData.get("reference") ?? "").trim();

  if (
    typeof studentId !== "string" ||
    typeof planId !== "string" ||
    !isPaymentMethod(method) ||
    !Number.isFinite(amountReceived) ||
    amountReceived <= 0 ||
    amountReceived > 99_999_999.99 ||
    reference.length > 100
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

  if (planError || amountReceived < Number(plan.price)) {
    return { error: "El monto pagado no cubre el total del plan." };
  }

  const { data, error } = await supabase.rpc("confirm_membership_payment", {
    p_amount_received: amountReceived,
    p_method: method,
    p_plan_id: planId,
    p_reference: method === "transferencia" ? reference || undefined : undefined,
    p_student_id: studentId,
  });

  if (error) return { error: `No se pudo registrar el pago: ${error.message}` };

  const paymentId = data?.[0]?.payment_id;
  if (!paymentId) return { error: "No se pudo recuperar el comprobante." };

  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/membresias");
  revalidatePath(`/alumnos/${studentId}`);
  redirect(`/membresias/pago-confirmado/${paymentId}`);
}
