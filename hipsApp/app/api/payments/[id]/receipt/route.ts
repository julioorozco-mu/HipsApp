import { calculateChange, getPaymentFolio, isPaymentMethod } from "@/lib/payment";
import { createPaymentReceiptPdf } from "@/lib/payment-receipt-pdf";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      `
        id,
        amount,
        amount_received,
        method,
        paid_at,
        reference,
        students!payments_student_id_fkey(nombre),
        memberships!payments_membership_id_fkey(
          fecha_inicio,
          fecha_vencimiento,
          membership_plans(name)
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: "No se pudo crear el comprobante" },
      { status: 500 }
    );
  }

  const membership = payment?.memberships;
  const plan = membership?.membership_plans;
  if (
    !payment ||
    !payment.students?.nombre ||
    !membership ||
    !plan?.name ||
    !isPaymentMethod(payment.method)
  ) {
    return Response.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  const total = Number(payment.amount);
  const amountReceived = Number(payment.amount_received);
  const folio = getPaymentFolio(payment.id, payment.paid_at);
  const pdf = await createPaymentReceiptPdf({
    amountReceived,
    change: calculateChange(amountReceived, total),
    endDate: membership.fecha_vencimiento,
    folio,
    method: payment.method,
    paidAt: payment.paid_at,
    planName: plan.name,
    reference: payment.reference,
    startDate: membership.fecha_inicio,
    studentName: payment.students.nombre,
    total,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${folio}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
