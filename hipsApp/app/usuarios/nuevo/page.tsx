import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { UserForm } from "@/components/features/users/user-form";
import { normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function NewUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (normalizeRole(profile?.role) !== "superadmin") redirect("/");

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
            Nuevo usuario
          </h1>
          <button
            type="button"
            aria-label="Más opciones"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <MoreHorizontal className="size-6" />
          </button>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-6 pb-4 sm:px-8">
          <UserForm />
        </div>
        <AppNav active="/usuarios" />
      </div>
    </main>
  );
}
