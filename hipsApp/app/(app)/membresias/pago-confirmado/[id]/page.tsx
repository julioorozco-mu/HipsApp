import { Check, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { PrintReceiptButton } from "@/components/features/memberships/print-receipt-button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatIsoDate } from "@/lib/date";
import {
  calculateChange,
  formatCurrency,
  getPaymentFolio,
  PAYMENT_METHOD_LABEL,
} from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";

export default async function PaymentConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

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
        student_id,
        students!payments_student_id_fkey(nombre, telefono),
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
    throw new Error(`No se pudo cargar el comprobante: ${error.message}`);
  }
  if (!payment) notFound();

  const student = payment.students;
  const membership = payment.memberships;
  const plan = membership?.membership_plans;
  if (!student?.nombre || !student.telefono || !membership || !plan?.name) {
    notFound();
  }

  const total = Number(payment.amount);
  const amountReceived = Number(payment.amount_received);
  const change = calculateChange(amountReceived, total);
  const folio = getPaymentFolio(payment.id, payment.paid_at);
  const whatsappText = [
    "HipsApp · Pago confirmado",
    `Folio: ${folio}`,
    `Fecha y hora de emisión: ${formatDateTime(payment.paid_at)}`,
    `Alumno: ${student.nombre}`,
    `Plan: ${plan.name}`,
    `Periodo: ${formatIsoDate(membership.fecha_inicio)} – ${formatIsoDate(membership.fecha_vencimiento)}`,
    `Total: ${formatCurrency(total)}`,
    `Monto pagado: ${formatCurrency(amountReceived)}`,
    `Cambio: ${formatCurrency(change)}`,
  ].join("\n");
  const whatsappUrl = `https://wa.me/${student.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 print:bg-white print:p-0 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] print:min-h-0 print:rounded-none print:shadow-none sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-8 pb-6 sm:px-7 sm:pt-10">
          <section className="text-center" aria-labelledby="payment-confirmed-title">
            <div className="mx-auto grid size-20 place-items-center rounded-full border-2 border-[oklch(0.64_0.18_150)] bg-[oklch(0.97_0.035_150)] text-[oklch(0.55_0.19_150)]">
              <Check className="size-10" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <h1
              id="payment-confirmed-title"
              className="mt-5 text-3xl font-bold tracking-[-0.04em]"
            >
              Pago confirmado
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              El pago se registró correctamente.
            </p>
          </section>

          <section className="mt-7 rounded-2xl border bg-card px-5 py-5 text-sm shadow-sm">
            <dl className="space-y-3">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Folio</dt>
                <dd className="font-medium">{folio}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Alumno</dt>
                <dd className="text-right font-medium">{student.nombre}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{plan.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Periodo</dt>
                <dd className="text-right font-medium">
                  {formatIsoDate(membership.fecha_inicio)} –{" "}
                  {formatIsoDate(membership.fecha_vencimiento)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Método de pago</dt>
                <dd className="font-medium">
                  {PAYMENT_METHOD_LABEL[payment.method]}
                </dd>
              </div>
              {payment.method === "transferencia" && payment.reference ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Referencia</dt>
                  <dd className="max-w-[60%] break-all text-right font-medium">
                    {payment.reference}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-dashed border-border pt-4">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-bold">{formatCurrency(total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Monto pagado</dt>
                <dd className="font-semibold">{formatCurrency(amountReceived)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Cambio</dt>
                <dd className="font-semibold">{formatCurrency(change)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                <dt className="font-semibold">Estatus</dt>
                <dd>
                  <Badge className="bg-[oklch(0.9_0.13_130)] text-[oklch(0.3_0.08_130)]">
                    Membresía activa
                  </Badge>
                </dd>
              </div>
            </dl>
          </section>

          <div className="mt-auto space-y-3 pt-6 print:hidden">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[oklch(0.55_0.19_150)] bg-card px-5 text-base font-semibold text-[oklch(0.55_0.19_150)] transition-colors hover:bg-[oklch(0.96_0.035_150)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.93_0.05_150)]"
            >
              <MessageCircle className="size-6" aria-hidden="true" />
              Compartir por WhatsApp
            </a>
            <PrintReceiptButton paymentId={payment.id} folio={folio} />
            <Link
              href={`/alumnos/${payment.student_id}`}
              className="flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75"
            >
              Volver al perfil
            </Link>
          </div>
        </div>

        <div className="print:hidden">
          <AppNav />
        </div>
      </div>
    </main>
  );
}
