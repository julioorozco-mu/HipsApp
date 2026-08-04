import { NextRequest, NextResponse } from "next/server";

import { PAYMENT_METHOD_LABEL } from "@/lib/payment";
import {
  loadPaymentReport,
  normalizePaymentReportFilters,
} from "@/lib/payment-report";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

const reportDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Mexico_City",
});

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatReportDate(value: string) {
  return reportDateFormatter.format(new Date(value)).replace(",", "");
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
    "Fecha y hora",
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
    formatReportDate(row.paidAt),
    row.studentName,
    row.planName,
    PAYMENT_METHOD_LABEL[row.method],
    row.amount.toFixed(2),
    row.amountReceived.toFixed(2),
    row.reference,
    row.recordedBy,
    row.id,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const filename = `pagos-${filters.from}-a-${filters.to}.csv`;

  return new NextResponse(Buffer.from(csv, "latin1"), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Language": "es-MX",
      "Content-Type": "text/csv; charset=windows-1252",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
