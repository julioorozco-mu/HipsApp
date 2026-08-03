import { notFound, redirect } from "next/navigation";
import { MoreShell } from "@/components/features/more/more-shell";
import { TemplateForm } from "@/components/features/more/template-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data } = await supabase.from("message_templates").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const template = data as typeof data & { kind?: string };
  return <MoreShell title="Editar plantilla" backHref="/plantillas"><TemplateForm template={{ id: template.id, name: template.name, body: template.body, kind: template.kind }} /></MoreShell>;
}
