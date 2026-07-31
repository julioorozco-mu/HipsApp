import { ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { PaymentForm } from "@/components/features/memberships/payment-form";
import { createClient } from "@/lib/supabase/server";

export default async function RegisterPaymentPage(
  props: {
    searchParams: Promise<{ student?: string | string[] }>;
  }
) {
  const { student } = await props.searchParams;
  const initialStudentId = typeof student === "string" ? student : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const [studentsResult, plansResult] = await Promise.all([
    supabase.from("students").select("id, nombre").eq("active", true).order("nombre"),
    supabase
      .from("membership_plans")
      .select("id, name, kind, price")
      .eq("active", true)
      .in("kind", ["mensual", "clase_suelta"])
      .order("price", { ascending: false }),
  ]);

  if (studentsResult.error || plansResult.error) {
    throw new Error(
      `No se pudo preparar el pago: ${
        studentsResult.error?.message ?? plansResult.error?.message
      }`
    );
  }

  return (
    <main className="min-h-dvh bg-card sm:bg-[oklch(0.965_0.018_300)] sm:p-5">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col overflow-hidden bg-card sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-[2.5rem] sm:shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)]">
        <div className="flex flex-1 flex-col px-7 pt-4 pb-3 sm:pt-9 sm:pb-6">
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
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <MoreHorizontal className="size-7" />
            </button>
          </header>

          <div className="mt-3 flex flex-1">
            <PaymentForm
              initialStudentId={initialStudentId}
              plans={plansResult.data.map((plan) => ({
                ...plan,
                price: Number(plan.price),
              }))}
              students={studentsResult.data}
            />
          </div>
        </div>

        <AppNav active="/alumnos" />
      </div>
    </main>
  );
}
