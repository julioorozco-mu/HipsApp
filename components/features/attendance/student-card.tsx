"use client";

import { useState, useTransition } from "react";
import { CalendarClock, MoreVertical, Phone, Receipt, Target } from "lucide-react";

import { renewMembership } from "@/app/actions/memberships";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteStudentAlert } from "@/components/features/students/delete-student-alert";
import { EditStudentDialog } from "@/components/features/students/edit-student-dialog";
import type { AttendanceStudent } from "@/components/features/attendance/attendance-list";
import { cn } from "@/lib/utils";
import {
  MEMBERSHIP_STATUS_BADGE_CLASS,
  MEMBERSHIP_STATUS_LABEL,
  getMembershipStatus,
} from "@/lib/membership";

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const paymentDateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function StudentCard({
  student,
  marked,
  onMark,
}: {
  student: AttendanceStudent;
  marked: boolean;
  onMark: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRenewing, startRenewing] = useTransition();
  const membershipStatus = getMembershipStatus(
    student.membership?.fecha_vencimiento
  );

  function handleConfirmRenew() {
    startRenewing(async () => {
      await renewMembership(student.id);
      setConfirmOpen(false);
    });
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{student.nombre}</CardTitle>
          <Badge
            className={cn(
              "border-0",
              MEMBERSHIP_STATUS_BADGE_CLASS[membershipStatus]
            )}
          >
            {MEMBERSHIP_STATUS_LABEL[membershipStatus]}
          </Badge>
        </div>

        <CardAction className="flex items-center gap-2">
          <Badge
            className={cn(
              "border-0",
              student.current_streak > 0
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            🔥 {student.current_streak}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Mas opciones para ${student.nombre}`}
                />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                Editar Alumno
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>

        <EditStudentDialog
          student={student}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
        <DeleteStudentAlert
          studentId={student.id}
          nombre={student.nombre}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />

        <div className="flex flex-col gap-0.5 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5" />
            {student.telefono}
          </span>
          {student.membership && (
            <>
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                Vence {dateFormatter.format(new Date(`${student.membership.fecha_vencimiento}T00:00:00`))}
              </span>
              <span className="flex items-center gap-1.5">
                <Receipt className="size-3.5" />
                Pagado {paymentDateFormatter.format(new Date(student.membership.created_at))}
              </span>
            </>
          )}
        </div>

        {student.objetivo_peso_grasa != null && (
          <Badge variant="outline" className="w-fit gap-1 font-sans">
            <Target className="size-3" />
            Objetivo: {student.objetivo_peso_grasa} kg
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <Button
          onClick={onMark}
          disabled={marked}
          className="h-16 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-lg font-semibold text-white hover:brightness-105"
        >
          {marked ? "Registrado ✅" : "Marcar Asistencia"}
        </Button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button
            onClick={() => setConfirmOpen(true)}
            variant="outline"
            className="h-12 w-full rounded-xl text-base font-semibold"
          >
            Registrar Pago
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar pago de {student.nombre}</DialogTitle>
              <DialogDescription>
                Esto renovara su membresia por 1 mes.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={isRenewing}
                className="h-12 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmRenew}
                disabled={isRenewing}
                className="h-12 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white"
              >
                {isRenewing ? "Procesando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
