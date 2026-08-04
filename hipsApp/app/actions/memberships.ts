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

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

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

  revalidatePaymentPaths(studentId);
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
  const startDate = String(formData.get("startDate") ?? "").trim();
  const today = todayFormatter.format(new Date());

  if (
    typeof studentId !== "string" ||
    typeof planId !== "string" ||
    !isPaymentMethod(method) ||
    !Number.isFinite(amountReceived) ||
    amountReceived <= 0 ||
    amountReceived > 99_999_999.99 ||
    reference.length > 100 ||
    !isoDatePattern.test(startDate) ||
    startDate > today
  ) {
    return { error: "Revisa los datos y la fecha de inicio del pago." };
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

  const { data, error } = await supabase.rpc("confirm_membership_payment" as never, {
    p_amount_received: amountReceived,
    p_method: method,
    p_plan_id: planId,
    p_reference: method === "transferencia" ? reference || null : null,
    p_start_date: startDate,
    p_student_id: studentId,
  } as never);

  if (error) {
    if (error.message.includes("start date cannot be in the future")) {
      return { error: "La fecha de inicio no puede estar en el futuro." };
    }
    return { error: `No se pudo registrar el pago: ${error.message}` };
  }

  const result = data as { payment_id?: string }[] | null;
  const paymentId = result?.[0]?.payment_id;
  if (!paymentId) return { error: "No se pudo recuperar el comprobante." };

  revalidatePaymentPaths(studentId);
  redirect(`/membresias/pago-confirmado/${paymentId}`);
}

function revalidatePaymentPaths(studentId: string) {
  revalidatePath("/");
  revalidatePath("/asistencia");
  revalidatePath("/membresias");
  revalidatePath("/reportes/pagos");
  revalidatePath(`/alumnos/${studentId}`);
}
