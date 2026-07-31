import {
  ArrowLeft,
  CalendarDays,
  Flame,
  MessageCircle,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  MEMBERSHIP_STATUS_BADGE_CLASS,
  MEMBERSHIP_STATUS_LABEL,
  type MembershipStatus,
} from "@/lib/membership";
import { getMonthlyAttendanceStats } from "@/lib/streak";
import { createClient } from "@/lib/supabase/server";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function StudentProfilePage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/acceso");

  const [studentResult, attendanceResult] = await Promise.all([
    supabase
      .from("student_overview")
      .select(
        "id, nombre, telefono, current_streak, fecha_vencimiento, membership_status"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("attendance")
      .select("marked_at, status")
      .eq("student_id", id)
      .order("marked_at"),
  ]);

  if (studentResult.error || attendanceResult.error) {
    throw new Error(
      `No se pudo cargar el perfil: ${
        studentResult.error?.message ?? attendanceResult.error?.message
      }`
    );
  }

  const student = studentResult.data;
  if (!student?.id || !student.nombre || !student.telefono) notFound();

  const membershipStatus =
    (student.membership_status as MembershipStatus | null) ?? "sin_registro";
  const monthlyStats = getMonthlyAttendanceStats(attendanceResult.data);
  const paymentDate = student.fecha_vencimiento
    ? dateFormatter.format(new Date(`${student.fecha_vencimiento}T00:00:00`))
    : "Sin fecha registrada";
  const whatsappUrl = `https://wa.me/${student.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hola ${student.nombre}, te recordamos que tu membresía vence el ${paymentDate}.`
  )}`;

  return (
    <main className="min-h-dvh bg-[oklch(0.965_0.018_300)] p-2 sm:p-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col overflow-hidden rounded-[2.5rem] bg-card shadow-[0_18px_50px_oklch(0.25_0.04_300/0.14)] sm:min-h-[calc(100dvh-2.5rem)]">
        <div className="flex flex-1 flex-col px-4 pt-5 pb-6 sm:px-7 sm:pt-9">
          <header className="flex items-center justify-between">
            <Link
              href="/alumnos"
              aria-label="Volver a alumnos"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <ArrowLeft className="size-7" />
            </Link>
            <button
              type="button"
              aria-label="Más opciones"
              className="grid size-12 place-items-center rounded-full transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-accent"
            >
              <MoreHorizontal className="size-7" />
            </button>
          </header>

          <section className="mt-1 text-center" aria-labelledby="student-name">
            <div className="mx-auto grid size-24 place-items-center rounded-full bg-[oklch(0.64_0.18_150)] text-3xl font-semibold text-[oklch(0.985_0.006_150)] shadow-sm">
              {initials(student.nombre)}
            </div>
            <h1
              id="student-name"
              className="mt-4 text-[2rem] leading-tight font-bold tracking-[-0.04em]"
            >
              {student.nombre}
            </h1>
            <Badge
              className={`mt-2 h-7 px-3 text-sm ${
                MEMBERSHIP_STATUS_BADGE_CLASS[membershipStatus]
              }`}
            >
              Membresía {MEMBERSHIP_STATUS_LABEL[membershipStatus].toLowerCase()}
            </Badge>
          </section>

          <section
            className="mt-6 grid grid-cols-3 gap-2.5"
            aria-label="Resumen del alumno"
          >
            <Card className="min-h-28 items-center justify-center gap-1 rounded-2xl px-1 py-3 text-center">
              <strong className="text-3xl leading-none">{monthlyStats.total}</strong>
              <span className="text-xs text-muted-foreground">
                asistencias
                <span className="block">este mes</span>
              </span>
            </Card>
            <Card className="min-h-28 items-center justify-center gap-1 rounded-2xl px-1 py-3 text-center">
              <strong className="flex items-center gap-1 text-3xl leading-none">
                {student.current_streak ?? 0}
                <Flame
                  className="size-6 text-primary"
                  fill="currentColor"
                  aria-hidden="true"
                />
              </strong>
              <span className="text-xs text-muted-foreground">racha total</span>
            </Card>
            <Card className="min-h-28 items-center justify-center gap-1 rounded-2xl px-1 py-3 text-center">
              <strong className="text-3xl leading-none">
                {monthlyStats.bestStreak}
              </strong>
              <span className="text-xs text-muted-foreground">
                mejor racha
                <span className="block">este mes</span>
              </span>
            </Card>
          </section>

          <Card className="mt-5 gap-3 rounded-2xl px-5 py-5">
            <h2 className="text-sm font-medium text-muted-foreground">
              Próximo pago
            </h2>
            <p className="flex items-center gap-3 text-lg font-semibold">
              <CalendarDays className="size-6 shrink-0" aria-hidden="true" />
              {paymentDate}
            </p>
          </Card>

          <div className="mt-auto space-y-3 pt-6">
            <Link
              href={`/membresias/registrar?student=${student.id}`}
              className="flex min-h-14 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-primary/75"
            >
              Renovar membresía
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-primary bg-card px-5 text-base font-semibold text-[oklch(0.55_0.19_150)] transition-colors hover:bg-[oklch(0.96_0.035_150)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-[oklch(0.93_0.05_150)]"
            >
              <MessageCircle className="size-6" aria-hidden="true" />
              Enviar recordatorio por WhatsApp
            </a>
          </div>
        </div>

        <AppNav active="/alumnos" />
      </div>
    </main>
  );
}
