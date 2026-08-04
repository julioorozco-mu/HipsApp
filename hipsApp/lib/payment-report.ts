import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PaymentReportMethod = "todos" | "efectivo" | "transferencia" | "tarjeta";
export type PaymentReportPlan = "todos" | "mensual" | "clase_suelta";

export type PaymentReportFilters = {
  from: string;
  method: PaymentReportMethod;
  plan: PaymentReportPlan;
  to: string;
};

export type PaymentReportRow = {
  amount: number;
  amountReceived: number;
  id: string;
  method: Exclude<PaymentReportMethod, "todos">;
  paidAt: string;
  planKind: Exclude<PaymentReportPlan, "todos">;
  planName: string;
  recordedBy: string;
  reference: string | null;
  studentName: string;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function currentMonthRange(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = formatter.format(now);
  return { from: `${today.slice(0, 7)}-01`, to: today };
}

export function normalizePaymentReportFilters(input: {
  from?: string;
  method?: string;
  plan?: string;
  to?: string;
}): PaymentReportFilters {
  const range = currentMonthRange();
  const from = isoDatePattern.test(input.from ?? "") ? input.from! : range.from;
  const to = isoDatePattern.test(input.to ?? "") ? input.to! : range.to;
  const method: PaymentReportMethod = [
    "efectivo",
    "transferencia",
    "tarjeta",
  ].includes(input.method ?? "")
    ? (input.method as PaymentReportMethod)
    : "todos";
  const plan: PaymentReportPlan = ["mensual", "clase_suelta"].includes(
    input.plan ?? ""
  )
    ? (input.plan as PaymentReportPlan)
    : "todos";

  return from <= to
    ? { from, method, plan, to }
    : { from: to, method, plan, to: from };
}

function startOfDate(date: string) {
  return new Date(`${date}T00:00:00-06:00`).toISOString();
}

function dayAfter(date: string) {
  const next = new Date(`${date}T12:00:00-06:00`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)}T00:00:00-06:00`;
}

export async function loadPaymentReport(filters: PaymentReportFilters) {
  const supabase = await createClient();
  let paymentQuery = supabase
    .from("payments")
    .select(
      "id, student_id, membership_id, amount, amount_received, method, paid_at, recorded_by, reference"
    )
    .gte("paid_at", startOfDate(filters.from))
    .lt("paid_at", new Date(dayAfter(filters.to)).toISOString())
    .order("paid_at", { ascending: false });

  if (filters.method !== "todos") {
    paymentQuery = paymentQuery.eq("method", filters.method);
  }

  const paymentsResult = await paymentQuery;
  if (paymentsResult.error) {
    throw new Error(`No se pudieron cargar los pagos: ${paymentsResult.error.message}`);
  }

  const payments = paymentsResult.data ?? [];
  const studentIds = [...new Set(payments.map((payment) => payment.student_id))];
  const membershipIds = [...new Set(payments.map((payment) => payment.membership_id))];
  const recorderIds = [
    ...new Set(
      payments
        .map((payment) => payment.recorded_by)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [studentsResult, membershipsResult, recordersResult] = await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, nombre").in("id", studentIds)
      : Promise.resolve({ data: [], error: null }),
    membershipIds.length
      ? supabase
          .from("memberships")
          .select("id, plan_id")
          .in("id", membershipIds)
      : Promise.resolve({ data: [], error: null }),
    recorderIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", recorderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const lookupError =
    studentsResult.error ?? membershipsResult.error ?? recordersResult.error;
  if (lookupError) {
    throw new Error(`No se pudo completar el reporte: ${lookupError.message}`);
  }

  const planIds = [
    ...new Set((membershipsResult.data ?? []).map((membership) => membership.plan_id)),
  ];
  const plansResult = planIds.length
    ? await supabase
        .from("membership_plans")
        .select("id, name, kind")
        .in("id", planIds)
    : { data: [], error: null };
  if (plansResult.error) {
    throw new Error(`No se pudieron cargar los planes: ${plansResult.error.message}`);
  }

  const students = new Map(
    (studentsResult.data ?? []).map((student) => [student.id, student.nombre])
  );
  const memberships = new Map(
    (membershipsResult.data ?? []).map((membership) => [
      membership.id,
      membership.plan_id,
    ])
  );
  const plans = new Map(
    (plansResult.data ?? []).map((plan) => [plan.id, plan])
  );
  const recorders = new Map(
    (recordersResult.data ?? []).map((profile) => [profile.id, profile.full_name])
  );

  const rows: PaymentReportRow[] = payments.flatMap((payment) => {
    const plan = plans.get(memberships.get(payment.membership_id) ?? "");
    if (!plan || (filters.plan !== "todos" && plan.kind !== filters.plan)) return [];

    return [
      {
        amount: Number(payment.amount),
        amountReceived: Number(payment.amount_received),
        id: payment.id,
        method: payment.method,
        paidAt: payment.paid_at,
        planKind: plan.kind,
        planName: plan.name,
        recordedBy: payment.recorded_by
          ? recorders.get(payment.recorded_by) ?? "Usuario eliminado"
          : "Sistema",
        reference: payment.reference,
        studentName: students.get(payment.student_id) ?? "Alumno eliminado",
      },
    ];
  });

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const byMethod = {
    efectivo: rows
      .filter((row) => row.method === "efectivo")
      .reduce((sum, row) => sum + row.amount, 0),
    tarjeta: rows
      .filter((row) => row.method === "tarjeta")
      .reduce((sum, row) => sum + row.amount, 0),
    transferencia: rows
      .filter((row) => row.method === "transferencia")
      .reduce((sum, row) => sum + row.amount, 0),
  };

  return {
    average: rows.length ? total / rows.length : 0,
    byMethod,
    count: rows.length,
    rows,
    total,
  };
}
