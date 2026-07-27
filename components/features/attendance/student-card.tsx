import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceStudent } from "@/components/features/attendance/attendance-list";

export function StudentCard({
  student,
  marked,
  onMark,
}: {
  student: AttendanceStudent;
  marked: boolean;
  onMark: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{student.nombre}</CardTitle>
          <Badge variant={marked ? "default" : "outline"}>
            🔥 {student.current_streak}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onMark}
          disabled={marked}
          className="h-16 w-full rounded-xl text-lg font-semibold"
        >
          {marked ? "Registrado ✅" : "Marcar Asistencia"}
        </Button>
      </CardContent>
    </Card>
  );
}
