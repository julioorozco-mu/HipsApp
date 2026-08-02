"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronRight,
  GraduationCap,
  LockKeyhole,
  Search,
  ShieldCheck,
  ShieldEllipsis,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import type { AppRole } from "@/lib/roles";

export type ManagedUserItem = {
  createdAt: string;
  email: string;
  fullName: string;
  id: string;
  phone: string | null;
  role: AppRole;
};

type Filter = "todos" | "administradores" | "alumnos";

const filters: { label: string; value: Filter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Administradores", value: "administradores" },
  { label: "Alumnos", value: "alumnos" },
];

function roleMeta(role: AppRole) {
  if (role === "superadmin") {
    return {
      icon: ShieldCheck,
      label: "Superadmin",
      badge: "bg-[oklch(0.92_0.08_295)] text-primary",
    };
  }
  if (role === "admin") {
    return {
      icon: ShieldEllipsis,
      label: "Administrador",
      badge: "bg-[oklch(0.93_0.05_250)] text-[oklch(0.42_0.13_250)]",
    };
  }
  return {
    icon: GraduationCap,
    label: "Alumno",
    badge: "bg-[oklch(0.93_0.08_145)] text-[oklch(0.4_0.13_145)]",
  };
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 12 || !digits.startsWith("52")) return phone;
  const national = digits.slice(2);
  return `+52 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
}

function UserContent({ user }: { user: ManagedUserItem }) {
  const meta = roleMeta(user.role);
  const Icon = meta.icon;

  return (
    <>
      <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{user.fullName}</span>
          <span className={`shrink-0 rounded-full px-2 py-1 text-[0.65rem] font-semibold ${meta.badge}`}>
            {meta.label}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-muted-foreground">
          {user.email}
        </span>
        {user.phone ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {formatPhone(user.phone)}
          </span>
        ) : null}
      </span>
    </>
  );
}

export function UserList({ users }: { users: ManagedUserItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    return users.filter((user) => {
      const matchesText =
        user.fullName.toLocaleLowerCase("es-MX").includes(normalized) ||
        user.email.toLocaleLowerCase("es-MX").includes(normalized) ||
        (user.phone ?? "").includes(normalized);
      const matchesRole =
        filter === "todos" ||
        (filter === "administradores" &&
          ["superadmin", "admin"].includes(user.role)) ||
        (filter === "alumnos" && user.role === "alumno");
      return matchesText && matchesRole;
    });
  }, [filter, query, users]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-4 shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Buscar usuario"
          placeholder="Buscar usuario"
          className="h-12 rounded-xl pl-11 text-base"
        />
      </div>

      <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1" aria-label="Filtrar usuarios">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              filter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary/60 hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-0 overflow-y-auto overscroll-contain rounded-2xl border bg-card">
        {visibleUsers.length ? (
          <ul className="divide-y">
            {visibleUsers.map((user) =>
              user.role === "superadmin" ? (
                <li
                  key={user.id}
                  className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <UserContent user={user} />
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground" title="Cuenta protegida">
                    <LockKeyhole className="size-4" />
                  </span>
                </li>
              ) : (
                <li key={user.id}>
                  <Link
                    href={`/usuarios/${user.id}/editar`}
                    aria-label={`Editar a ${user.fullName}`}
                    className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:bg-secondary"
                  >
                    <UserContent user={user} />
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </Link>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No hay usuarios que coincidan.
          </p>
        )}
      </div>
    </div>
  );
}
