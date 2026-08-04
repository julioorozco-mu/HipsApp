"use client";

import Link from "next/link";
import { BarChart3, MoreHorizontal, Settings2 } from "lucide-react";

export function PaymentActionsMenu({ canConfigure }: { canConfigure: boolean }) {
  return (
    <details className="group relative">
      <summary
        aria-label="Opciones de pagos"
        className="grid size-12 cursor-pointer list-none place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal className="size-7" />
      </summary>
      <div className="absolute top-12 right-0 z-50 w-64 overflow-hidden rounded-2xl border bg-card p-2 shadow-xl">
        <Link
          href="/reportes/pagos"
          className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <BarChart3 className="size-5 text-primary" />
          Reportes de pagos
        </Link>
        {canConfigure ? (
          <Link
            href="/membresias/configuracion"
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Settings2 className="size-5 text-primary" />
            Configurar precios y banco
          </Link>
        ) : null}
      </div>
    </details>
  );
}
