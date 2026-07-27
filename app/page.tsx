import { AttendanceList } from "@/components/features/attendance/attendance-list";
import { AddStudentDialog } from "@/components/features/students/add-student-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("students")
    .select(
      "id, nombre, telefono, objetivo_peso_grasa, current_streak, highest_streak, memberships(fecha_vencimiento, estado, created_at)"
    )
    .order("nombre");

  if (error) {
    throw new Error(`No se pudo cargar la lista de alumnos: ${error.message}`);
  }

  const students = rows.map(({ memberships, ...student }) => ({
    ...student,
    membership:
      memberships
        .slice()
        .sort((a, b) => b.fecha_vencimiento.localeCompare(a.fecha_vencimiento))
        .at(0) ?? null,
  }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-background p-4">
      <header className="flex items-center justify-between gap-3 py-2">
        <div>
          <h1 className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text font-display text-xl font-extrabold tracking-tight text-transparent">
            Hipsdance Flow
          </h1>
          <p className="text-sm text-muted-foreground">
            {students.length} alumno{students.length === 1 ? "" : "s"}{" "}
            registrado{students.length === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      <AddStudentDialog />

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aun no hay alumnos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Registra tu primer alumno para comenzar a pasar lista.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AttendanceList students={students} />
      )}
    </main>
  );
}
