import { ChevronRight, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MEMBERSHIP_STATUS_BADGE_CLASS,
  MEMBERSHIP_STATUS_LABEL,
  type MembershipStatus,
} from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const statuses: MembershipStatus[] = [
  "activa",
  "por_vencer",
  "vencida",
  "sin_registro",
];

const summary = [
  {
    label: "Activas",
    status: "activa",
    className: "bg-[oklch(0.91_0.08_125)]",
  },
  {
    label: "Por vencer",
    status: "por_vencer",
    className: "bg-[oklch(0.92_0.18_110)]",
  },
  {
    label: "Vencidas",
    status: "vencida",
    className: "bg-[oklch(0.93_0.08_350)]",
  },
] as const;

const avatarColors = [
  "bg-[oklch(0.64_0.18_150)]",
  "bg-[oklch(0.6_0.22_293)]",
  "bg-[oklch(0.78_0.2_120)]",
  "bg-[oklch(0.62_0.22_340)]",
];

export default async function MembershipsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const { data, error } = await supabase
    .from("student_overview")
    .select("id, nombre, fecha_vencimiento, membership_status")
    .eq("active", true)
    .order("fecha_vencimiento");

  if (error) {
    throw new Error(`No se pudieron cargar las membresías: ${error.message}`);
  }

  const students = data.flatMap((student) => {
    if (!student.id || !student.nombre) return [];
    const status = statuses.includes(student.membership_status as MembershipStatus)
      ? (student.membership_status as MembershipStatus)
      : "sin_registro";
    return [{ ...student, id: student.id, nombre: student.nombre, status }];
  });

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-6 pb-5 sm:px-7 sm:pt-10">
          <header className="flex items-center justify-between gap-4">
            <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.04em] sm:text-4xl">
              Membresías
            </h1>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <MoreHorizontal className="size-7" />
            </button>
          </header>

          <section
            className="mt-5 grid grid-cols-3 gap-2.5"
            aria-label="Resumen de membresías"
          >
            {summary.map((item) => (
              <Card
                key={item.status}
                className={`min-h-28 items-center justify-center gap-1 rounded-2xl border-0 px-1 py-3 text-center ring-0 ${item.className}`}
              >
                <span className="text-xs font-semibold sm:text-sm">{item.label}</span>
                <strong className="text-4xl leading-none">
                  {
                    students.filter((student) => student.status === item.status)
                      .length
                  }
                </strong>
              </Card>
            ))}
          </section>

          <section className="mt-5" aria-labelledby="membership-list">
            <h2 id="membership-list" className="sr-only">
              Alumnos y estado de membresía
            </h2>
            <div className="overflow-hidden rounded-2xl border bg-card">
              {students.length ? (
                <ul className="divide-y">
                  {students.map((student, index) => {
                    const date = student.fecha_vencimiento
                      ? dateFormatter.format(
                          new Date(`${student.fecha_vencimiento}T00:00:00`)
                        )
                      : "Sin fecha";
                    const datePrefix =
                      student.status === "activa"
                        ? "Próximo pago"
                        : student.status === "por_vencer"
                          ? "Vence"
                          : student.status === "vencida"
                            ? "Venció"
                            : "Próximo pago";

                    return (
                      <li key={student.id}>
                        <Link
                          href={`/alumnos/${student.id}`}
                          className="grid min-h-24 grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-3 transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:bg-accent"
                        >
                          <span
                            aria-hidden="true"
                            className={`grid size-11 place-items-center rounded-full text-sm font-bold text-[oklch(0.985_0.006_300)] ${avatarColors[index % avatarColors.length]}`}
                          >
                            {student.nombre
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {student.nombre}
                            </span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">
                              {datePrefix}: {date}
                            </span>
                          </span>
                          <Badge
                            className={`h-7 px-2.5 ${
                              MEMBERSHIP_STATUS_BADGE_CLASS[student.status]
                            }`}
                          >
                            {MEMBERSHIP_STATUS_LABEL[student.status]}
                          </Badge>
                          <ChevronRight
                            className="size-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                  Aún no hay alumnos registrados.
                </p>
              )}
            </div>
          </section>

          <Link
            href="/membresias/registrar"
            className="mt-auto flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75"
          >
            Registrar pago
          </Link>
        </div>

        <AppNav active="/alumnos" />
      </div>
    </main>
  );
}
