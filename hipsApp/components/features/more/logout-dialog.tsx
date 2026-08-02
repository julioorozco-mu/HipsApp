"use client";

import { useState } from "react";
import { ChevronRight, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";

export function LogoutDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="grid min-h-17 w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-3xl border px-5 py-3 text-left font-semibold text-destructive hover:bg-destructive/5">
        <LogOut className="size-6" />Cerrar sesión<ChevronRight className="size-5 text-foreground" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-5" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive"><LogOut className="size-7" /></span>
            <h2 id="logout-title" className="mt-4 text-xl font-bold">¿Cerrar sesión?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tendrás que iniciar sesión nuevamente.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border font-semibold">Cancelar</button>
              <form action={logout}><button className="min-h-11 w-full rounded-xl bg-destructive px-3 font-semibold text-destructive-foreground">Cerrar sesión</button></form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
