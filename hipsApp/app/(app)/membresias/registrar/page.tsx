import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { PaymentActionsMenu } from "@/components/features/memberships/payment-actions-menu";
import { PaymentForm } from "@/components/features/memberships/payment-form";
import { isPaymentMethod } from "@/lib/payment";
import { parsePaymentSettings } from "@/lib/payment-settings";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

export default async function RegisterPaymentPage(
  props: {
    searchParams: Promise<{
      amount?: string | string[];
      method?: string | string[];
      planId?: string | string[];
      reference?: string | string[];
      student?: string | string[];
    }>;
  }
) {
  const { amount, method, planId, reference, student } = await props.searchParams;
  const initialStudentId = typeof student === "string" ? student : undefined;
  const initialPlanId = typeof planId === "string" ? planId : undefined;
  const initialMethod = isPaymentMethod(method) ? method : undefined;
  const amountValue = typeof amount === "string" ? Number(amount) : Number.NaN;
  const initialAmount =
    Number.isFinite(amountValue) &&
    amountValue >= 0 &&
    amountValue <= 99_999_999.99
      ? amountValue.toFixed(2)
      : undefined;
  const initialReference =
    typeof reference === "string" ? reference.slice(0, 100) : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const [profileResult, studentsResult, plansResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("student_overview")
      .select("id, nombre, membership_id")
      .eq("active", true)
      .order("nombre"),
    supabase
      .from("membership_plans")
      .select("id, name, kind, price")
      .eq("active", true)
      .in("kind", ["mensual", "clase_suelta"])
      .order("price", { ascending: false }),
    supabase.from("academy_settings").select("*").eq("id", true).maybeSingle(),
  ]);

  const role = normalizeRole(profileResult.data?.role);
  if (!canManageOperations(role)) redirect("/");

  const loadError =
    profileResult.error ?? studentsResult.error ?? plansResult.error ?? settingsResult.error;
  if (loadError) {
    throw new Error(`No se pudo preparar el pago: ${loadError.message}`);
  }

  const paymentSettings = parsePaymentSettings(settingsResult.data);

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-5 pb-6 sm:px-7 sm:pt-9">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href="/membresias"
              aria-label="Volver a membresías"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" />
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-[-0.035em]">
              Registrar pago
            </h1>
            <PaymentActionsMenu canConfigure={role === "superadmin"} />
          </header>

          <div className="mt-6 flex flex-1">
            <PaymentForm
              initialAmount={initialAmount}
              initialMethod={initialMethod}
              initialPlanId={initialPlanId}
              initialReference={initialReference}
              initialStudentId={initialStudentId}
              plans={plansResult.data.map((plan) => ({
                ...plan,
                price: Number(plan.price),
              }))}
              students={studentsResult.data.flatMap((student) =>
                student.id && student.nombre
                  ? [
                      {
                        id: student.id,
                        nombre: student.nombre,
                      },
                    ]
                  : []
              )}
              today={todayFormatter.format(new Date())}
              transferDetails={paymentSettings}
            />
          </div>
        </div>

        <AppNav />
      </div>
    </main>
  );
}
