import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { MoreShell } from "@/components/features/more/more-shell";
import { TemplatesList, type TemplateItem } from "@/components/features/more/templates-list";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type TemplateRow = {
  active: boolean;
  body: string;
  id: string;
  kind?: string;
  name: string;
};

function kind(value: string | undefined): TemplateItem["kind"] {
  if (value === "pago" || value === "confirmacion" || value === "otro") return value;
  return "recordatorio";
}

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("message_templates").select("*").order("created_at"),
  ]);
  if (error) throw new Error(error.message);
  if (!canManageOperations(normalizeRole(String(profile?.role)))) redirect("/mas");

  const templates: TemplateItem[] = ((data ?? []) as TemplateRow[]).map((template) => ({
    active: template.active,
    body: template.body,
    id: template.id,
    kind: kind(template.kind),
    name: template.name,
  }));

  return (
    <MoreShell
      title="Plantillas de mensajes"
      menuHref="/plantillas/nueva"
      menuLabel="Crear nueva plantilla"
    >
      <TemplatesList templates={templates} />
      <Link
        href="/plantillas/nueva"
        aria-label="Nueva plantilla"
        className="fixed right-6 bottom-28 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl sm:right-[calc(50%-15rem)]"
      >
        <Plus className="size-7" />
      </Link>
    </MoreShell>
  );
}
