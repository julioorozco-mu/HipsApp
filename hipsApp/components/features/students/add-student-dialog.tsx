"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";

import { addStudent, type StudentFormState } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: StudentFormState = { error: null };

export function AddStudentDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    addStudent,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
      setOpen(false);
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="h-12 w-full rounded-xl text-base font-semibold" />
        }
      >
        + Nuevo Alumno
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Alumno</DialogTitle>
          <DialogDescription>
            Registra los datos basicos para comenzar a llevar su asistencia.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              name="nombre"
              required
              autoComplete="name"
              placeholder="Ej. Ana Garcia"
              className="h-12 text-base"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefono_local">Telefono</Label>
            <div className="flex items-center gap-2 rounded-lg border border-input bg-transparent pl-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
              <span className="text-base text-muted-foreground">+52</span>
              <Input
                id="telefono_local"
                name="telefono_local"
                type="tel"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                required
                autoComplete="tel-national"
                placeholder="9991234567"
                className="h-12 border-0 pl-0 text-base focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="objetivo_peso_grasa">
              Objetivo (peso/grasa, opcional)
            </Label>
            <Input
              id="objetivo_peso_grasa"
              name="objetivo_peso_grasa"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              placeholder="Ej. 65.5"
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
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {isPending ? "Guardando..." : "Guardar Alumno"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
