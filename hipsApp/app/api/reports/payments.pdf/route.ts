import { NextRequest, NextResponse } from "next/server";

import {
  loadPaymentReport,
  normalizePaymentReportFilters,
} from "@/lib/payment-report";
import { createPaymentReportPdf } from "@/lib/payment-report-pdf";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

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
  const pdf = await createPaymentReportPdf({ filters, report });
  const filename = `pagos-${filters.from}-a-${filters.to}.pdf`;

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
