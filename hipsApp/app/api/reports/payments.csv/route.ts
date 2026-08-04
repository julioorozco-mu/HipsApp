import { NextRequest, NextResponse } from "next/server";

import {
  loadPaymentReport,
  normalizePaymentReportFilters,
} from "@/lib/payment-report";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!canManageOperations(normalizeRole(profile?.role))) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const search = request.nextUrl.searchParams;
  const filters = normalizePaymentReportFilters({
    from: search.get("from") ?? undefined,
    method: search.get("method") ?? undefined,
    plan: search.get("plan") ?? undefined,
    to: search.get("to") ?? undefined,
  });
  const report = await loadPaymentReport(filters);

  const header = [
    "Fecha",
    "Alumno",
    "Plan",
    "Método",
    "Importe",
    "Monto recibido",
    "Referencia",
    "Registrado por",
    "ID de pago",
  ];
  const rows = report.rows.map((row) => [
    row.paidAt,
    row.studentName,
    row.planName,
    row.method,
    row.amount.toFixed(2),
    row.amountReceived.toFixed(2),
    row.reference,
    row.recordedBy,
    row.id,
  ]);
  const csv = `\uFEFF${[header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="pagos-${filters.from}-a-${filters.to}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
