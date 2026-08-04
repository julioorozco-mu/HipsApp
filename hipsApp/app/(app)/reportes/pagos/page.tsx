import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  Download,
  FileText,
  Landmark,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { formatCurrency, PAYMENT_METHOD_LABEL } from "@/lib/payment";
import {
  loadPaymentReport,
  normalizePaymentReportFilters,
} from "@/lib/payment-report";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

const methodSummary = [
  { key: "efectivo", label: "Efectivo", icon: Banknote },
  { key: "transferencia", label: "Transferencia", icon: Landmark },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
] as const;

export default async function PaymentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    method?: string;
    plan?: string;
    to?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!canManageOperations(normalizeRole(profile?.role))) redirect("/");

  const filters = normalizePaymentReportFilters(await searchParams);
  const report = await loadPaymentReport(filters);
  const exportParams = new URLSearchParams({
    from: filters.from,
    method: filters.method,
    plan: filters.plan,
    to: filters.to,
  });

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-5 pb-5 sm:px-7 sm:pt-9">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href="/membresias"
              aria-label="Volver a membresías"
              className="grid size-12 place-items-center rounded-full hover:bg-secondary"
            >
              <ArrowLeft className="size-7" />
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-[-0.035em]">
              Reportes de pagos
            </h1>
            <Link
              href={`/api/reports/payments.csv?${exportParams.toString()}`}
              aria-label="Descargar reporte CSV"
              className="grid size-12 place-items-center rounded-full text-primary hover:bg-secondary"
            >
              <Download className="size-6" />
            </Link>
          </header>

          <form className="mt-5 grid gap-3 rounded-2xl border bg-secondary/35 p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold">
                Desde
                <input
                  type="date"
                  name="from"
                  defaultValue={filters.from}
                  className="min-h-11 rounded-xl border bg-card px-3 text-sm"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Hasta
                <input
                  type="date"
                  name="to"
                  defaultValue={filters.to}
                  className="min-h-11 rounded-xl border bg-card px-3 text-sm"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-xs font-semibold">
                Método
                <select
                  name="method"
                  defaultValue={filters.method}
                  className="min-h-11 rounded-xl border bg-card px-3 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Plan
                <select
                  name="plan"
                  defaultValue={filters.plan}
                  className="min-h-11 rounded-xl border bg-card px-3 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="mensual">Mensual</option>
                  <option value="clase_suelta">Clase suelta</option>
                </select>
              </label>
            </div>
            <button className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              Aplicar filtros
            </button>
          </form>

          <section className="mt-5 grid grid-cols-3 gap-2" aria-label="Resumen financiero">
            <article className="rounded-2xl bg-primary px-3 py-4 text-primary-foreground">
              <TrendingUp className="size-5" />
              <p className="mt-2 text-[0.65rem] opacity-80">Ingresos</p>
              <strong className="block truncate text-lg">{formatCurrency(report.total)}</strong>
            </article>
            <article className="rounded-2xl bg-[oklch(0.91_0.08_125)] px-3 py-4">
              <ReceiptText className="size-5" />
              <p className="mt-2 text-[0.65rem] text-muted-foreground">Pagos</p>
              <strong className="block text-xl">{report.count}</strong>
            </article>
            <article className="rounded-2xl bg-[oklch(0.95_0.05_80)] px-3 py-4">
              <FileText className="size-5" />
              <p className="mt-2 text-[0.65rem] text-muted-foreground">Promedio</p>
              <strong className="block truncate text-lg">{formatCurrency(report.average)}</strong>
            </article>
          </section>

          <section className="mt-4 grid grid-cols-3 gap-2" aria-label="Ingresos por método">
            {methodSummary.map(({ key, label, icon: Icon }) => (
              <article key={key} className="rounded-xl border px-2 py-3 text-center">
                <Icon className="mx-auto size-5 text-primary" />
                <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">{label}</p>
                <strong className="block truncate text-sm">
                  {formatCurrency(report.byMethod[key])}
                </strong>
              </article>
            ))}
          </section>

          <section className="mt-5" aria-labelledby="payment-ledger-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="payment-ledger-title" className="text-lg font-bold">
                  Historial de pagos
                </h2>
                <p className="text-xs text-muted-foreground">
                  Registro compartido entre Superadmin y Administradores.
                </p>
              </div>
              <Link
                href={`/api/reports/payments.csv?${exportParams.toString()}`}
                className="shrink-0 text-sm font-semibold text-primary"
              >
                Exportar CSV
              </Link>
            </div>

            {report.rows.length ? (
              <ul className="overflow-hidden rounded-2xl border bg-card divide-y">
                {report.rows.map((row) => (
                  <li key={row.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{row.studentName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {row.planName} · {PAYMENT_METHOD_LABEL[row.method]}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateTimeFormatter.format(new Date(row.paidAt))} · {row.recordedBy}
                        </p>
                        {row.reference ? (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            Ref. {row.reference}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <strong>{formatCurrency(row.amount)}</strong>
                        <a
                          href={`/api/payments/${row.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 block text-xs font-semibold text-primary"
                        >
                          Comprobante
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed px-5 py-12 text-center">
                <ReceiptText className="mx-auto size-9 text-muted-foreground" />
                <p className="mt-3 font-semibold">No hay pagos en este periodo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajusta los filtros o registra un nuevo pago.
                </p>
              </div>
            )}
          </section>
        </div>
        <AppNav />
      </div>
    </main>
  );
}
