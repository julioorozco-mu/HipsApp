import { redirect } from "next/navigation";
import { updateSettings } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";
import { MoreShell } from "@/components/features/more/more-shell";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data } = await supabase.from("academy_settings").select("*").eq("id", true).single();
  const settings = data as typeof data & {
    appearance?: string;
    business_hours?: string;
    currency?: string;
    notifications_enabled?: boolean;
  };

  return (
    <MoreShell title="Configuración">
      <ActionForm action={updateSettings} label="Guardar configuración">
        <label className="grid gap-2 text-sm font-semibold">Academia<input className={fieldClass} name="academy_name" defaultValue={settings.academy_name} /></label>
        <label className="grid gap-2 text-sm font-semibold">Horario<input className={fieldClass} name="business_hours" defaultValue={settings.business_hours ?? "Lun–Vie · 7:00–21:00"} /></label>
        <label className="grid gap-2 text-sm font-semibold">Moneda<select className={fieldClass} name="currency" defaultValue={settings.currency ?? "MXN"}><option value="MXN">MXN</option><option value="USD">USD</option></select></label>
        <label className="grid gap-2 text-sm font-semibold">Zona horaria<select className={fieldClass} name="timezone" defaultValue={settings.timezone}><option value="America/Mexico_City">América/Ciudad de México</option><option value="America/Cancun">América/Cancún</option><option value="America/Tijuana">América/Tijuana</option></select></label>
        <label className="flex min-h-14 items-center justify-between rounded-xl border px-4 font-semibold">Notificaciones<input type="checkbox" name="notifications_enabled" defaultChecked={settings.notifications_enabled ?? true} className="size-5" /></label>
        <label className="grid gap-2 text-sm font-semibold">Apariencia<select className={fieldClass} name="appearance" defaultValue={settings.appearance ?? "system"}><option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>
      </ActionForm>
    </MoreShell>
  );
}
