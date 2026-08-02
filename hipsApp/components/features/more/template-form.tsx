import { saveTemplate } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";

export function TemplateForm({ template }: { template?: { id: string; name: string; body: string; kind?: string } }) {
  const action = saveTemplate.bind(null, template?.id ?? null);
  return (
    <ActionForm action={action} label="Guardar plantilla">
      <label className="grid gap-2 text-sm font-semibold">Nombre de la plantilla<input className={fieldClass} name="name" defaultValue={template?.name ?? ""} placeholder="Recordatorio de clase" required /></label>
      <label className="grid gap-2 text-sm font-semibold">Tipo<select className={fieldClass} name="kind" defaultValue={template?.kind ?? "recordatorio"}><option value="recordatorio">Recordatorio</option><option value="pago">Aviso de pago</option><option value="confirmacion">Confirmación de pago</option><option value="otro">Otro</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">Mensaje<textarea className="min-h-36 w-full rounded-xl border bg-card p-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25" name="body" maxLength={400} defaultValue={template?.body ?? ""} placeholder="Hola {nombre}, te recordamos que tu clase de {clase} es hoy a las {hora}." required /><span className="font-normal text-muted-foreground">Variables disponibles: {"{nombre}"}, {"{clase}"}, {"{hora}"}.</span></label>
      <div className="rounded-2xl bg-[#eaf7e9] p-4"><p className="text-xs font-semibold text-green-800">Vista previa (WhatsApp)</p><p className="mt-2 rounded-xl bg-white p-3 text-sm">Hola Ana, te recordamos que tu clase de Zumba es hoy a las 7:00 PM. ¡Te esperamos! 🟢</p></div>
    </ActionForm>
  );
}
