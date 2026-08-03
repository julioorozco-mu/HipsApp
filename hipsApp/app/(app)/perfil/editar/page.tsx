import { redirect } from "next/navigation";

import { updateProfile } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";
import { MoreShell } from "@/components/features/more/more-shell";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ProfileRow = {
  email: string;
  full_name: string;
  role: string;
  whatsapp?: string | null;
};

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);

  const profile = data as ProfileRow;
  if (normalizeRole(String(profile.role)) === "superadmin") redirect("/perfil");

  return (
    <MoreShell title="Editar perfil" backHref="/perfil">
      <ActionForm action={updateProfile} label="Guardar cambios">
        <label className="grid gap-2 text-sm font-semibold">
          Nombre completo
          <input
            className={fieldClass}
            name="full_name"
            defaultValue={profile.full_name}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Correo
          <input className={`${fieldClass} bg-secondary`} value={profile.email} readOnly />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          WhatsApp
          <input
            className={fieldClass}
            name="whatsapp"
            defaultValue={profile.whatsapp ?? ""}
            placeholder="+525512345678"
            inputMode="tel"
          />
          <span className="font-normal text-muted-foreground">
            Se usará para contacto y notificaciones.
          </span>
        </label>
      </ActionForm>
    </MoreShell>
  );
}
