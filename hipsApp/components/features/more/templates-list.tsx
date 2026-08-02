"use client";

import Link from "next/link";
import { BellRing, CircleDollarSign, MessageSquareText } from "lucide-react";
import { useState } from "react";

export type TemplateItem = {
  active: boolean;
  body: string;
  id: string;
  kind: "recordatorio" | "pago" | "confirmacion" | "otro";
  name: string;
};

const filters = [
  { label: "Todos", value: "todos" },
  { label: "Recordatorio", value: "recordatorio" },
  { label: "Aviso de pago", value: "pago" },
  { label: "Confirmación de pago", value: "confirmacion" },
  { label: "Otro", value: "otro" },
] as const;

const icons = {
  confirmacion: MessageSquareText,
  otro: MessageSquareText,
  pago: CircleDollarSign,
  recordatorio: BellRing,
};

export function TemplatesList({ templates }: { templates: TemplateItem[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("todos");
  const visible = filter === "todos"
    ? templates
    : templates.filter((template) => template.kind === filter);

  return (
    <div className="grid gap-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => {
          const active = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid min-w-0 gap-3">
        {visible.map((template) => {
          const Icon = icons[template.kind] ?? MessageSquareText;
          return (
            <Link
              key={template.id}
              href={`/plantillas/${template.id}/editar`}
              className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-colors hover:bg-secondary"
            >
              <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 overflow-hidden">
                <span className="block truncate font-bold">{template.name}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  WhatsApp · {template.active ? "Activa" : "Inactiva"}
                </span>
                <span className="mt-2 block max-w-full overflow-hidden break-words text-sm text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                  {template.body}
                </span>
              </span>
            </Link>
          );
        })}

        {!visible.length ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay plantillas en este filtro.
          </p>
        ) : null}
      </div>
    </div>
  );
}
