import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import {
  UserEditForm,
  type EditableUser,
} from "@/components/features/users/user-edit-form";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type EditableProfile = {
  email: string;
  full_name: string;
  id: string;
  role: string;
  whatsapp?: string | null;
};

export default async function EditUserPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [actorResult, profileResult, studentResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("students").select("telefono").eq("id", id).maybeSingle(),
  ]);

  if (normalizeRole(actorResult.data?.role) !== "superadmin") redirect("/alumnos");
  if (profileResult.error || studentResult.error) {
    throw new Error(
      `No se pudo cargar el usuario: ${
        profileResult.error?.message ?? studentResult.error?.message
      }`
    );
  }

  const profile = profileResult.data as EditableProfile | null;
  if (!profile?.id || !profile.full_name || !profile.email) notFound();

  const role = normalizeRole(profile.role);
  if (role === "superadmin") redirect("/usuarios");

  const editableUser: EditableUser = {
    email: profile.email,
    fullName: profile.full_name,
    id: profile.id,
    phone:
      role === "alumno"
        ? studentResult.data?.telefono ?? profile.whatsapp ?? null
        : profile.whatsapp ?? null,
    role,
  };

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center px-5 pt-7 sm:px-8 sm:pt-10">
          <Link
            href="/usuarios"
            aria-label="Volver a usuarios"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-center text-2xl font-bold tracking-[-0.03em]">
            Editar usuario
          </h1>
          <button
            type="button"
            aria-label="Más opciones"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <MoreHorizontal className="size-6" />
          </button>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto px-5 pt-6 pb-4 sm:px-8">
          <UserEditForm user={editableUser} />
        </div>
        <AppNav />
      </div>
    </main>
  );
}
