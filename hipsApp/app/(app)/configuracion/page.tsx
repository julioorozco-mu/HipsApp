import { redirect } from "next/navigation";

import { updateSettings } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";
import { BusinessHoursEditor } from "@/components/features/more/business-hours-editor";
import { MoreShell } from "@/components/features/more/more-shell";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type SettingsRow = {
  academy_name: string;
  address?: string | null;
  appearance?: string;
  business_hours?: string;
  notifications_enabled?: boolean;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("academy_settings").select("*").eq("id", true).single(),
  ]);
  const role = normalizeRole(String(profile?.role));
  if (!canManageOperations(role)) redirect("/mas");
  const settings = data as SettingsRow;
  const superadmin = role === "superadmin";

  return (
    <MoreShell title="Configuración">
      <ActionForm action={updateSettings} label="Guardar configuración">
        {superadmin ? (
          <>
            <label className="grid gap-2 text-sm font-semibold">
              Academia
              <input
                className={fieldClass}
                name="academy_name"
                defaultValue={settings.academy_name}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Dirección
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border bg-card p-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
                name="address"
                defaultValue={settings.address ?? ""}
                placeholder="Calle, número, colonia, ciudad y código postal"
              />
            </label>
          </>
        ) : null}

        <BusinessHoursEditor defaultValue={settings.business_hours} />

        <label className="flex min-h-14 items-center justify-between rounded-xl border px-4 font-semibold">
          <span>
            Notificaciones
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Avisos operativos para administradores.
            </span>
          </span>
          <input
            type="checkbox"
            name="notifications_enabled"
            defaultChecked={settings.notifications_enabled ?? true}
            className="size-5 accent-primary"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Apariencia
          <select
            className={fieldClass}
            name="appearance"
            defaultValue={settings.appearance ?? "system"}
          >
            <option value="system">Usar configuración del dispositivo</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </label>
      </ActionForm>
    </MoreShell>
  );
}
