import { ArrowLeft, CalendarDays, Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { NewStudentForm } from "@/components/features/students/new-student-form";
import { createClient } from "@/lib/supabase/server";

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
});

const displayDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string | string[] }>;
}) {
  const { creado } = await searchParams;
  const createdStudentId = typeof creado === "string" ? creado : null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const { data: createdStudent, error } = createdStudentId
    ? await supabase
        .from("students")
        .select("id, nombre, fecha_registro")
        .eq("id", createdStudentId)
        .maybeSingle()
    : { data: null, error: null };

  if (error) {
    throw new Error(`No se pudo cargar el alumno registrado: ${error.message}`);
  }

  const today = todayFormatter.format(new Date());

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-5 pb-6 sm:px-7 sm:pt-9">
          <header className="grid grid-cols-[3rem_1fr_3rem] items-center">
            <Link
              href="/alumnos"
              aria-label="Volver a alumnos"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" aria-hidden="true" />
            </Link>
            <h1 className="text-center text-2xl font-bold tracking-[-0.035em]">
              {createdStudent ? "Alumno guardado" : "Nuevo alumno"}
            </h1>
          </header>

          {createdStudent ? (
            <section className="flex flex-1 flex-col pt-8 text-center">
              <div className="mx-auto grid size-24 place-items-center rounded-full border-2 border-[oklch(0.64_0.18_150)] bg-[oklch(0.97_0.035_150)] text-[oklch(0.55_0.19_150)]">
                <Check className="size-12" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-3xl font-bold tracking-[-0.04em]">
                Alumno agregado
              </h2>
              <p className="mt-1 text-muted-foreground">
                Los datos se guardaron correctamente.
              </p>

              <div className="mt-7 rounded-2xl border bg-card px-5 py-5 text-left shadow-sm">
                <p className="text-lg font-semibold">{createdStudent.nombre}</p>
                <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="size-5" aria-hidden="true" />
                  Fecha de ingreso:{" "}
                  {displayDateFormatter.format(
                    new Date(createdStudent.fecha_registro)
                  )}
                </p>
              </div>

              <div className="mt-auto space-y-3 pt-8">
                <Link
                  href={`/alumnos/${createdStudent.id}`}
                  className="flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75"
                >
                  Ver perfil
                </Link>
                <Link
                  href="/alumnos/nuevo"
                  className="flex min-h-14 items-center justify-center rounded-xl border border-primary bg-card px-5 text-base font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/10"
                >
                  Agregar otro alumno
                </Link>
              </div>
            </section>
          ) : (
            <div className="mt-5 flex flex-1">
              <NewStudentForm today={today} />
            </div>
          )}
        </div>

        <AppNav />
      </div>
    </main>
  );
}

