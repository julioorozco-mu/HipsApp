import Link from "next/link";
import { redirect } from "next/navigation";
import { MoreShell } from "@/components/features/more/more-shell";
import { createClient } from "@/lib/supabase/server";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as typeof data & { whatsapp?: string | null };
  const name = profile.full_name;
  const role = profile.role === "admin" ? "Administrador" : "Instructora";

  return (
    <MoreShell title="Perfil">
      <div className="mx-auto grid size-24 place-items-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">{initials(name)}</div>
      <dl className="mt-7 divide-y rounded-2xl border px-4">
        <div className="py-4"><dt className="text-xs font-semibold text-muted-foreground">Nombre completo</dt><dd className="mt-1 font-medium">{name}</dd></div>
        <div className="py-4"><dt className="text-xs font-semibold text-muted-foreground">Correo</dt><dd className="mt-1 font-medium">{profile.email}</dd></div>
        <div className="py-4"><dt className="text-xs font-semibold text-muted-foreground">WhatsApp</dt><dd className="mt-1 font-medium">{profile.whatsapp || "Sin registrar"}</dd></div>
        <div className="py-4"><dt className="text-xs font-semibold text-muted-foreground">Rol</dt><dd className="mt-1 font-medium">{role}</dd></div>
      </dl>
      <Link href="/perfil/editar" className="mt-auto flex min-h-13 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground">Editar perfil</Link>
    </MoreShell>
  );
}
