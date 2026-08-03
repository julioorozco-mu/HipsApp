import { AlertTriangle, ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { ConfirmPaymentForm } from "@/components/features/memberships/confirm-payment-form";
import { formatIsoDate } from "@/lib/date";
import { getMembershipExpirationDate } from "@/lib/membership";
import {
  calculateChange,
  formatCurrency,
  isPaymentMethod,
  PAYMENT_METHOD_LABEL,
} from "@/lib/payment";
import { createClient } from "@/lib/supabase/server";

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function ReviewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{
    amount?: string | string[];
    method?: string | string[];
    planId?: string | string[];
    reference?: string | string[];
    student?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const studentId = first(params.student);
  const planId = first(params.planId);
  const methodValue = first(params.method);
  const amountValue = first(params.amount);
  const reference = first(params.reference)?.trim().slice(0, 100) ?? "";
  const amount = Number(amountValue);

  if (
    !studentId ||
    !planId ||
    !isPaymentMethod(methodValue) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 99_999_999.99
  ) {
    redirect("/membresias/registrar");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const [studentResult, planResult] = await Promise.all([
    supabase
      .from("student_overview")
      .select("id, nombre, membership_id")
      .eq("id", studentId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("membership_plans")
      .select("id, name, kind, price")
      .eq("id", planId)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (studentResult.error || planResult.error) {
    throw new Error(
      `No se pudo revisar el pago: ${
        studentResult.error?.message ?? planResult.error?.message
      }`
    );
  }

  const student = studentResult.data;
  const plan = planResult.data;
  if (!student?.id || !student.nombre || !plan?.id) {
    redirect("/membresias/registrar");
  }

  const total = Number(plan.price);
  if (amount < total) redirect("/membresias/registrar");

  const today = todayFormatter.format(new Date());
  const expirationDate = getMembershipExpirationDate(today, plan.kind);
  const hasMembership = Boolean(student.membership_id);
  const editParams = new URLSearchParams({
    amount: amount.toFixed(2),
    method: methodValue,
    planId: plan.id,
    student: student.id,
  });
  if (reference) editParams.set("reference", reference);

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-5 pb-6 sm:px-7 sm:pt-9">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href={`/membresias/registrar?${editParams.toString()}`}
              aria-label="Volver a registrar pago"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" aria-hidden="true" />
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-[-0.035em]">
              Revisar pago
            </h1>
            <span className="grid size-12 place-items-center" aria-hidden="true">
              <MoreHorizontal className="size-7" />
            </span>
          </header>

          <section className="mt-7 rounded-2xl border bg-card px-5 py-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="grid size-11 place-items-center rounded-full bg-[oklch(0.64_0.18_150)] text-sm font-bold text-white">
                {initials(student.nombre)}
              </span>
              <div>
                <h2 className="font-semibold">{student.nombre}</h2>
                <p className="text-xs text-muted-foreground">
                  {hasMembership ? "Renovación de membresía" : "Primera membresía"}
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{plan.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Periodo</dt>
                <dd className="text-right font-medium">
                  {formatIsoDate(today)} – {formatIsoDate(expirationDate)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Método de pago</dt>
                <dd className="font-medium">{PAYMENT_METHOD_LABEL[methodValue]}</dd>
              </div>
              {methodValue === "transferencia" && reference ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Referencia</dt>
                  <dd className="max-w-[60%] break-all text-right font-medium">
                    {reference}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-dashed border-border pt-4">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-bold">{formatCurrency(total)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Monto pagado</dt>
                <dd className="font-semibold">{formatCurrency(amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Cambio</dt>
                <dd className="font-semibold">
                  {formatCurrency(calculateChange(amount, total))}
                </dd>
              </div>
            </dl>
          </section>

          <p className="mt-4 flex items-center gap-3 rounded-xl border border-[oklch(0.78_0.16_75)] bg-[oklch(0.97_0.04_80)] px-4 py-3 text-sm text-[oklch(0.45_0.12_65)]">
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            {hasMembership
              ? "Esta acción renovará la membresía."
              : "Esta acción activará la primera membresía."}
          </p>

          <div className="mt-auto space-y-3 pt-6">
            <Link
              href={`/membresias/registrar?${editParams.toString()}`}
              className="flex min-h-14 items-center justify-center rounded-xl border border-primary bg-card px-5 text-base font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/10"
            >
              Editar
            </Link>
            <ConfirmPaymentForm
              actionLabel={hasMembership ? "Confirmar renovación" : "Realizar pago"}
              amount={amount}
              method={methodValue}
              planId={plan.id}
              reference={reference}
              studentId={student.id}
            />
          </div>
        </div>

        <AppNav />
      </div>
    </main>
  );
}

