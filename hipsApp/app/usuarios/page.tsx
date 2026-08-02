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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
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
  if (normalizeRole(currentProfile?.role) !== "superadmin") redirect("/alumnos");

  const [profilesResult, studentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at"),
    supabase.from("students").select("id, telefono"),
  ]);

  if (profilesResult.error || studentsResult.error) {
    throw new Error(
      `No se pudieron cargar los usuarios: ${
        profilesResult.error?.message ?? studentsResult.error?.message
      }`
    );
  }

  const phones = new Map(
    (studentsResult.data ?? []).map((student) => [student.id, student.telefono])
  );
  const users: ManagedUserItem[] = (profilesResult.data ?? []).map((profile) => ({
    createdAt: profile.created_at,
    email: profile.email,
    fullName: profile.full_name,
    id: profile.id,
    phone: phones.get(profile.id) ?? null,
    role: normalizeRole(profile.role),
  }));

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
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

          {params.created === "1" ? (
            <p className="mt-4 rounded-xl bg-[oklch(0.93_0.08_145)] px-4 py-3 text-sm font-medium text-[oklch(0.38_0.12_145)]">
              Usuario creado correctamente.
            </p>
          ) : null}

          <UserList users={users} />
        </div>

        <Link
          href="/usuarios/nuevo"
          aria-label="Agregar usuario"
          className="absolute right-5 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 sm:right-8 sm:bottom-[calc(6.5rem+env(safe-area-inset-bottom))]"
        >
          <Plus className="size-7" />
        </Link>
        <AppNav active="/usuarios" />
      </div>
    </main>
  );
}
