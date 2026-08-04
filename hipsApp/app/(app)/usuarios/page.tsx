import Link from "next/link";
import { Plus, UserRoundCog } from "lucide-react";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import {
  UserList,
  type ManagedUserItem,
} from "@/components/features/users/user-list";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type ProfileWithPhone = {
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  role: string;
  whatsapp?: string | null;
};

type StudentOverviewRow = {
  correo: string | null;
  fecha_registro: string;
  id: string;
  membership_status: string | null;
  nombre: string;
  telefono: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    deleted?: string;
    updated?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [{ data: currentProfile }, params] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    searchParams,
  ]);
  if (normalizeRole(currentProfile?.role) !== "superadmin") {
    redirect("/alumnos");
  }

  const [profilesResult, studentsResult] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase
      .from("student_overview")
      .select(
        "id, nombre, telefono, correo, fecha_registro, membership_status"
      )
      .order("nombre"),
  ]);

  if (profilesResult.error || studentsResult.error) {
    throw new Error(
      `No se pudieron cargar los usuarios: ${
        profilesResult.error?.message ?? studentsResult.error?.message
      }`
    );
  }

  const profiles = (profilesResult.data ?? []) as ProfileWithPhone[];
  const students = (studentsResult.data ?? []) as StudentOverviewRow[];
  const studentMap = new Map(students.map((student) => [student.id, student]));
  const profileIds = new Set(profiles.map((profile) => profile.id));

  const users: ManagedUserItem[] = profiles.map((profile) => {
    const role = normalizeRole(profile.role);
    const student = role === "alumno" ? studentMap.get(profile.id) : null;
    return {
      createdAt: profile.created_at,
      editHref: `/usuarios/${profile.id}/editar`,
      email: student?.correo ?? profile.email,
      fullName: student?.nombre ?? profile.full_name,
      hasAccount: true,
      id: profile.id,
      membershipStatus: student?.membership_status ?? null,
      phone: student?.telefono ?? profile.whatsapp ?? null,
      role,
    };
  });

  students.forEach((student) => {
    if (profileIds.has(student.id)) return;
    users.push({
      createdAt: student.fecha_registro,
      editHref: `/alumnos/${student.id}/editar`,
      email: student.correo,
      fullName: student.nombre,
      hasAccount: false,
      id: student.id,
      membershipStatus: student.membership_status ?? "sin_registro",
      phone: student.telefono,
      role: "alumno",
    });
  });
  users.sort((a, b) => a.fullName.localeCompare(b.fullName, "es-MX"));

  const successMessage =
    params.created === "1"
      ? "Usuario creado correctamente."
      : params.updated === "1"
        ? "Usuario actualizado correctamente."
        : params.deleted === "1"
          ? "Usuario eliminado correctamente."
          : null;

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="relative mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:h-[calc(100dvh-2.5rem)]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-6 pb-4 sm:px-7 sm:pt-10">
          <header className="flex shrink-0 items-center justify-between gap-4">
            <div>
              <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
                Usuarios
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Administra instructores y alumnos.
              </p>
            </div>
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserRoundCog className="size-7" />
            </span>
          </header>

          {successMessage ? (
            <p className="mt-4 rounded-xl bg-[oklch(0.93_0.08_145)] px-4 py-3 text-sm font-medium text-[oklch(0.38_0.12_145)]">
              {successMessage}
            </p>
          ) : null}

          <UserList users={users} />
        </div>

        <Link
          href="/usuarios/nuevo"
          aria-label="Agregar usuario"
          className="fixed right-6 bottom-28 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 sm:right-[calc(50%-15rem)]"
        >
          <Plus className="size-7" />
        </Link>
        <AppNav />
      </div>
    </main>
  );
}
