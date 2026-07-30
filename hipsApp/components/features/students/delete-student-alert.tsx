"use client";

import { useState, useTransition } from "react";

import { deleteStudent } from "@/app/actions/students";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function DeleteStudentAlert({
  studentId,
  nombre,
  open,
  onOpenChange,
}: {
  studentId: string;
  nombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteStudent(studentId);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onOpenChange(false);
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setError(null);
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar a {nombre}</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borrara al alumno junto con todo su historial de asistencias,
            membresias y premios de forma permanente. Esta accion no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="h-12 rounded-xl">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            className="h-12 rounded-xl"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
