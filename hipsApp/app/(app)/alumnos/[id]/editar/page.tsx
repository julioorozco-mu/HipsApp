import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import {
  StudentEditForm,
  type EditableStudent,
} from "@/components/features/students/student-edit-form";
import { canManageOperations, normalizeRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, supabase] = await Promise.all([params, createClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/acceso");

  const [profileResult, studentResult] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("students")
      .select("id, nombre, telefono, correo, cumpleanos, objetivo_peso_grasa")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!canManageOperations(normalizeRole(profileResult.data?.role))) redirect("/");
  if (profileResult.error || studentResult.error) {
    throw new Error(
      `No se pudo cargar el alumno: ${
        profileResult.error?.message ?? studentResult.error?.message
      }`
    );
  }

  const student = studentResult.data;
  if (!student?.id || !student.nombre || !student.telefono) notFound();

  const editableStudent: EditableStudent = {
    correo: student.correo,
    cumpleanos: student.cumpleanos,
    id: student.id,
    nombre: student.nombre,
    objetivoPeso: student.objetivo_peso_grasa
      ? Number(student.objetivo_peso_grasa)
      : null,
    telefono: student.telefono,
  };

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <header className="grid grid-cols-[3rem_1fr_3rem] items-center px-5 pt-7 sm:px-8 sm:pt-10">
          <Link
            href={`/alumnos/${student.id}`}
            aria-label="Volver al perfil"
            className="grid size-11 place-items-center rounded-full hover:bg-secondary"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-center text-2xl font-bold tracking-[-0.03em]">
            Editar alumno
          </h1>
          <span className="grid size-11 place-items-center" aria-hidden="true">
            <MoreHorizontal className="size-6" />
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-6 pb-5 sm:px-8">
          <StudentEditForm student={editableStudent} />
        </div>
        <AppNav />
      </div>
    </main>
  );
}
