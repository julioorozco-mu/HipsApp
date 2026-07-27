import { AttendanceList } from "@/components/features/attendance/attendance-list";
import { AddStudentDialog } from "@/components/features/students/add-student-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("students")
    .select("id, nombre, current_streak, highest_streak, memberships!inner(estado)")
    .eq("memberships.estado", "activa")
    .order("nombre");

  if (error) {
    throw new Error(`No se pudo cargar la lista de alumnos: ${error.message}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-4">
      <header className="py-2">
        <h1 className="text-2xl font-semibold tracking-tight">Pase de Lista</h1>
        <p className="text-sm text-muted-foreground">
          {students.length} alumno{students.length === 1 ? "" : "s"} activo
          {students.length === 1 ? "" : "s"}
        </p>
      </header>

      <AddStudentDialog />

      {students.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aun no hay alumnos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Registra tu primer alumno con membresia activa para comenzar a
              pasar lista.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AttendanceList students={students} />
      )}
    </main>
  );
}
