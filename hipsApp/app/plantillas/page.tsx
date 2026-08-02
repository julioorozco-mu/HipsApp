import Link from "next/link";
import { BellRing, CircleDollarSign, MessageSquareText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { MoreShell } from "@/components/features/more/more-shell";
import { createClient } from "@/lib/supabase/server";

const iconByKind = { recordatorio: BellRing, pago: CircleDollarSign, confirmacion: MessageSquareText, otro: MessageSquareText } as const;
type TemplateRow = { id: string; name: string; body: string; active: boolean; kind?: keyof typeof iconByKind };

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data, error } = await supabase.from("message_templates").select("*").order("created_at");
  if (error) throw new Error(error.message);
  const templates = (data ?? []) as TemplateRow[];

  return (
    <MoreShell title="Plantillas de mensajes">
      <div className="grid gap-3">
        {templates.map((template) => {
          const Icon = iconByKind[template.kind ?? "otro"] ?? MessageSquareText;
          return <Link key={template.id} href={`/plantillas/${template.id}/editar`} className="flex items-center gap-4 rounded-2xl border p-4 hover:bg-secondary"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-6" /></span><span className="min-w-0 flex-1"><span className="block font-bold">{template.name}</span><span className="mt-1 block text-xs text-muted-foreground">WhatsApp · {template.active ? "Activa" : "Inactiva"}</span><span className="mt-2 block truncate text-sm text-muted-foreground">{template.body}</span></span></Link>;
        })}
      </div>
      <Link href="/plantillas/nueva" aria-label="Nueva plantilla" className="fixed right-6 bottom-28 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl sm:right-[calc(50%-15rem)]"><Plus className="size-7" /></Link>
    </MoreShell>
  );
}
