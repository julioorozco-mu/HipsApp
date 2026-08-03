import Link from "next/link";
import { KeyRound, Pencil } from "lucide-react";
import { redirect } from "next/navigation";

import { MoreShell } from "@/components/features/more/more-shell";
import { normalizeRole, roleLabel } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type ProfileRow = {
  email: string;
  full_name: string;
  role: string;
  whatsapp?: string | null;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ password?: string }>;
}) {
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
  const role = normalizeRole(String(profile.role));
  const superadmin = role === "superadmin";
  const params = await searchParams;

  return (
    <MoreShell title="Perfil">
      {params.password === "updated" ? (
        <p role="status" className="mb-5 rounded-xl bg-green-100 px-4 py-3 text-sm font-medium text-green-800">
          Contraseña actualizada correctamente.
        </p>
      ) : null}

      <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
        {initials(profile.full_name)}
      </div>

      <dl className="mt-7 divide-y rounded-2xl border px-4">
        <div className="py-4">
          <dt className="text-xs font-semibold text-muted-foreground">Nombre completo</dt>
          <dd className="mt-1 font-medium">{profile.full_name}</dd>
        </div>
        <div className="py-4">
          <dt className="text-xs font-semibold text-muted-foreground">Correo</dt>
          <dd className="mt-1 break-all font-medium">{profile.email}</dd>
        </div>
        {!superadmin ? (
          <div className="py-4">
            <dt className="text-xs font-semibold text-muted-foreground">WhatsApp</dt>
            <dd className="mt-1 font-medium">{profile.whatsapp || "Sin registrar"}</dd>
          </div>
        ) : null}
        <div className="py-4">
          <dt className="text-xs font-semibold text-muted-foreground">Rol</dt>
          <dd className="mt-1 font-medium">{roleLabel(role)}</dd>
        </div>
      </dl>

      {superadmin ? (
        <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
          Los datos de identidad del Superadmin están protegidos y no se editan desde la aplicación.
        </p>
      ) : null}

      <div className="mt-auto grid gap-3 pt-6">
        {!superadmin ? (
          <Link
            href="/perfil/editar"
            className="flex min-h-13 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            <Pencil className="size-5" /> Editar perfil
          </Link>
        ) : null}
        <Link
          href="/perfil/contrasena"
          className="flex min-h-13 items-center justify-center gap-2 rounded-xl border border-primary font-semibold text-primary"
        >
          <KeyRound className="size-5" /> Cambiar contraseña
        </Link>
      </div>
    </MoreShell>
  );
}
