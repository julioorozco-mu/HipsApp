"use client";

import { Download } from "lucide-react";

export function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-primary bg-card px-5 text-base font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/10"
    >
      <Download className="size-5" aria-hidden="true" />
      Descargar comprobante
    </button>
  );
}
