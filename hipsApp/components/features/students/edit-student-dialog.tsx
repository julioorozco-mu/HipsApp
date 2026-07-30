"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";

import { updateStudent, type StudentFormState } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: StudentFormState = { error: null };

export function EditStudentDialog({
  student,
  open,
  onOpenChange,
}: {
  student: { id: string; nombre: string; telefono: string; objetivo_peso_grasa: number | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateThisStudent = updateStudent.bind(null, student.id);
  const [state, formAction, isPending] = useActionState(
    updateThisStudent,
    initialState
  );
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      onOpenChange(false);
    }
    wasPending.current = isPending;
  }, [isPending, state.error, onOpenChange]);

  const telefonoLocal = student.telefono.replace(/^\+52/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Alumno</DialogTitle>
          <DialogDescription>
            Actualiza los datos de {student.nombre}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`nombre-${student.id}`}>Nombre</Label>
            <Input
              id={`nombre-${student.id}`}
              name="nombre"
              required
              autoComplete="name"
              defaultValue={student.nombre}
              className="h-12 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`telefono-${student.id}`}>Telefono</Label>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-transparent pl-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="text-base text-muted-foreground">+52</span>
              <Input
                id={`telefono-${student.id}`}
                name="telefono_local"
                type="tel"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
                autoComplete="tel-national"
                defaultValue={telefonoLocal}
                className="h-12 border-0 pl-0 text-base focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`objetivo-${student.id}`}>
              Objetivo (peso/grasa, opcional)
            </Label>
            <Input
              id={`objetivo-${student.id}`}
              name="objetivo_peso_grasa"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              defaultValue={student.objetivo_peso_grasa ?? ""}
              className="h-12 text-base"
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isPending}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-base font-semibold text-white"
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
