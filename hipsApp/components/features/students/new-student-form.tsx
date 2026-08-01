"use client";

import { useActionState } from "react";
import { CalendarDays, Mail, Scale, UserRoundPlus } from "lucide-react";
import Link from "next/link";

import { addStudent, type StudentFormState } from "@/app/actions/students";
import { Button } from "@/components/ui/button";
import { DateSelect } from "@/components/ui/date-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: StudentFormState = { error: null };

export function NewStudentForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(addStudent, initialState);
  const currentYear = Number(today.slice(0, 4));

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-primary/10 text-primary">
        <UserRoundPlus className="size-10" aria-hidden="true" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-sm font-semibold">
            Nombre completo
          </Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            autoComplete="name"
            placeholder="Escribe el nombre completo"
            className="h-12 rounded-xl px-4 text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="telefono_local" className="text-sm font-semibold">
            WhatsApp
          </Label>
          <div className="flex min-h-12 items-center rounded-xl border border-input bg-card pl-4 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-base text-muted-foreground">+52</span>
            <Input
              id="telefono_local"
              name="telefono_local"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              autoComplete="tel-national"
              placeholder="9991234567"
              className="h-12 border-0 pl-2 text-base focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="correo" className="text-sm font-semibold">
            Correo
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="correo"
              name="correo"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="nombre@correo.com"
              className="h-12 rounded-xl pl-10 text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fecha_ingreso" className="text-sm font-semibold">
            Fecha de ingreso
          </Label>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fecha_ingreso"
              type="date"
              value={today}
              readOnly
              aria-readonly="true"
              className="h-12 rounded-xl pl-10 text-base"
            />
          </div>
        </div>

        <DateSelect
          id="cumpleanos"
          name="cumpleanos"
          label="Cumpleaños"
          minYear={currentYear - 120}
          maxDate={today}
          required
        />

        <div className="space-y-1.5">
          <Label htmlFor="objetivo_peso_grasa" className="text-sm font-semibold">
            Peso ideal{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <div className="relative">
            <Scale className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="objetivo_peso_grasa"
              name="objetivo_peso_grasa"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="1"
              max="500"
              placeholder="Ej. 65"
              className="h-12 rounded-xl pr-12 pl-10 text-base"
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted-foreground">
              kg
            </span>
          </div>
        </div>

        <label className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/45 px-4 py-3">
          <span>
            <span className="block font-semibold">Realizar pago</span>
            <span className="block text-xs text-muted-foreground">
              Continuar al registro de pago después de guardar
            </span>
          </span>
          <span className="relative inline-flex shrink-0">
            <input
              type="checkbox"
              name="realizar_pago"
              className="peer sr-only"
            />
            <span className="h-7 w-12 rounded-full bg-muted-foreground/35 transition-colors peer-checked:bg-[oklch(0.64_0.18_150)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary" />
            <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
      </div>

      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-sm font-medium text-destructive"
      >
        {state.error}
      </p>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-3">
        <Button
          render={<Link href="/alumnos" />}
          variant="outline"
          className="min-h-14 rounded-xl text-base font-semibold"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={pending}
          className="min-h-14 rounded-xl text-base font-semibold"
        >
          {pending ? "Guardando…" : "Guardar alumno"}
        </Button>
      </div>
    </form>
  );
}
