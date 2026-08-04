"use client";

import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  LockKeyhole,
  Pencil,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteManagedUser,
  type ManageUserState,
} from "@/app/actions/users";
import { Input } from "@/components/ui/input";
import type { AppRole } from "@/lib/roles";

export type ManagedUserItem = {
  createdAt: string;
  editHref: string;
  email: string | null;
  fullName: string;
  hasAccount: boolean;
  id: string;
  membershipStatus: string | null;
  phone: string | null;
  role: AppRole;
};

type RoleFilter = "todos" | "administradores" | "alumnos";
type MembershipFilter =
  | "todos"
  | "activa"
  | "por_vencer"
  | "vencida"
  | "sin_registro";
type SortMode = "role_az" | "az" | "za";

const roleFilters: { label: string; value: RoleFilter }[] = [
  { label: "Todos", value: "todos" },
  { label: "Administradores", value: "administradores" },
  { label: "Alumnos", value: "alumnos" },
];
const ACTIONS_WIDTH = 184;
const initialDeleteState: ManageUserState = { error: null };
const roleRank: Record<AppRole, number> = {
  superadmin: 0,
  admin: 1,
  alumno: 2,
};

const membershipMeta: Record<string, { label: string; className: string }> = {
  activa: {
    label: "Activa",
    className: "bg-[oklch(0.93_0.08_145)] text-[oklch(0.38_0.13_145)]",
  },
  por_vencer: {
    label: "Por vencer",
    className: "bg-[oklch(0.95_0.12_100)] text-[oklch(0.43_0.13_90)]",
  },
  vencida: {
    label: "Vencida",
    className: "bg-[oklch(0.94_0.07_350)] text-[oklch(0.48_0.18_350)]",
  },
  sin_registro: {
    label: "Sin membresía",
    className: "bg-secondary text-muted-foreground",
  },
};

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
  const membership = membershipMeta[user.membershipStatus ?? "sin_registro"];

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
          {user.email ?? (user.hasAccount ? "Sin correo" : "Sin acceso a la PWA")}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {user.phone ? (
            <span className="text-xs text-muted-foreground">
              {formatPhone(user.phone)}
            </span>
          ) : null}
          {user.role === "alumno" ? (
            <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${membership.className}`}>
              {membership.label}
            </span>
          ) : null}
        </span>
      </span>
    </>
  );
}

function DeleteUserDialog({
  onClose,
  user,
}: {
  onClose: () => void;
  user: ManagedUserItem;
}) {
  const [state, action, pending] = useActionState(
    deleteManagedUser,
    initialDeleteState
  );

  return (
    <div className="fixed inset-0 z-[90] grid place-items-end bg-foreground/40 p-2 sm:place-items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-user-title"
        className="w-full max-w-md rounded-[2rem] bg-card p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar confirmación"
            className="grid size-10 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="size-5" />
          </button>
        </div>
        <h2 id="delete-user-title" className="mt-4 text-2xl font-bold tracking-tight">
          ¿Eliminar a {user.fullName}?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {user.role === "alumno"
            ? "Se eliminarán su acceso y su registro de alumno. Si tiene pagos históricos, HipsApp bloqueará la eliminación."
            : "Se eliminará definitivamente su acceso como Administrador."}
        </p>

        <form action={action} className="mt-5 grid gap-3">
          <input name="user_id" type="hidden" value={user.id} />
          {state.error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          ) : null}
          <button
            disabled={pending}
            className="min-h-12 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {pending ? "Eliminando…" : "Sí, eliminar usuario"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border px-4 font-semibold hover:bg-secondary"
          >
            Cancelar
          </button>
        </form>
      </section>
    </div>
  );
}

function SwipeUserRow({
  onDelete,
  open,
  onOpenChange,
  user,
}: {
  onDelete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ManagedUserItem;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const startXRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const offsetRef = useRef(0);
  const movedRef = useRef(false);
  const [offset, setOffset] = useState(open ? -ACTIONS_WIDTH : 0);
  const frontHref = user.role === "alumno" ? `/alumnos/${user.id}` : user.editHref;

  function updateOffset(next: number) {
    const clamped = Math.max(-ACTIONS_WIDTH, Math.min(0, next));
    offsetRef.current = clamped;
    setOffset(clamped);
  }

  useEffect(() => {
    updateOffset(open ? -ACTIONS_WIDTH : 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [onOpenChange, open]);

  function handlePointerDown(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    startXRef.current = event.clientX;
    startOffsetRef.current = offsetRef.current;
    movedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (startXRef.current === null) return;
    const delta = event.clientX - startXRef.current;
    if (Math.abs(delta) > 5) movedRef.current = true;
    updateOffset(startOffsetRef.current + delta);
  }

  function finishGesture(event: ReactPointerEvent<HTMLAnchorElement>) {
    if (startXRef.current === null) return;
    startXRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onOpenChange(offsetRef.current <= -ACTIONS_WIDTH / 2);
  }

  function cancelGesture() {
    startXRef.current = null;
    movedRef.current = false;
    updateOffset(open ? -ACTIONS_WIDTH : 0);
  }

  return (
    <li ref={rowRef} className="relative overflow-hidden bg-card">
      <div className="absolute inset-y-0 right-0 flex w-[184px]">
        <Link
          href={user.editHref}
          aria-label={`Editar a ${user.fullName}`}
          onFocus={() => onOpenChange(true)}
          className="grid w-[92px] place-items-center bg-primary text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-background"
        >
          <span className="grid place-items-center gap-1">
            <Pencil className="size-5" />
            Editar
          </span>
        </Link>
        <button
          type="button"
          aria-label={`Eliminar a ${user.fullName}`}
          onFocus={() => onOpenChange(true)}
          onClick={onDelete}
          className="grid w-[92px] place-items-center bg-destructive text-sm font-semibold text-destructive-foreground focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-background"
        >
          <span className="grid place-items-center gap-1">
            <Trash2 className="size-5" />
            Eliminar
          </span>
        </button>
      </div>

      <Link
        href={frontHref}
        aria-label={user.role === "alumno" ? `Ver perfil de ${user.fullName}` : `Editar a ${user.fullName}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishGesture}
        onPointerCancel={cancelGesture}
        onClick={(event) => {
          if (movedRef.current || open) {
            event.preventDefault();
            movedRef.current = false;
            if (open) onOpenChange(false);
          }
        }}
        className="relative z-10 grid min-h-24 touch-pan-y grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-card px-4 py-3 transition-[transform,background-color] duration-200 ease-out hover:bg-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary active:bg-secondary"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <UserContent user={user} />
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function UserList({ users }: { users: ManagedUserItem[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [membershipFilter, setMembershipFilter] =
    useState<MembershipFilter>("todos");
  const [sortMode, setSortMode] = useState<SortMode>("role_az");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUserItem | null>(null);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es-MX");
    const filtered = users.filter((user) => {
      const matchesText =
        user.fullName.toLocaleLowerCase("es-MX").includes(normalized) ||
        (user.email ?? "").toLocaleLowerCase("es-MX").includes(normalized) ||
        (user.phone ?? "").includes(normalized);
      const matchesRole =
        roleFilter === "todos" ||
        (roleFilter === "administradores" &&
          ["superadmin", "admin"].includes(user.role)) ||
        (roleFilter === "alumnos" && user.role === "alumno");
      const matchesMembership =
        membershipFilter === "todos" ||
        (user.role === "alumno" &&
          (user.membershipStatus ?? "sin_registro") === membershipFilter);
      return matchesText && matchesRole && matchesMembership;
    });

    return filtered.sort((a, b) => {
      const alphabetical = a.fullName.localeCompare(b.fullName, "es-MX", {
        sensitivity: "base",
      });
      if (sortMode === "az") return alphabetical;
      if (sortMode === "za") return -alphabetical;
      return roleRank[a.role] - roleRank[b.role] || alphabetical;
    });
  }, [membershipFilter, query, roleFilter, sortMode, users]);

  useEffect(() => {
    setOpenUserId(null);
  }, [membershipFilter, query, roleFilter, sortMode]);

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

      <div className="mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1" aria-label="Filtrar usuarios por rol">
        {roleFilters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={roleFilter === value}
            onClick={() => setRoleFilter(value)}
            className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              roleFilter === value
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-secondary/60 hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Orden
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="min-h-11 rounded-xl border bg-card px-3 text-sm font-medium text-foreground"
          >
            <option value="role_az">Rol · A–Z</option>
            <option value="az">Nombre · A–Z</option>
            <option value="za">Nombre · Z–A</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
          Membresía
          <select
            value={membershipFilter}
            onChange={(event) =>
              setMembershipFilter(event.target.value as MembershipFilter)
            }
            className="min-h-11 rounded-xl border bg-card px-3 text-sm font-medium text-foreground"
          >
            <option value="todos">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="por_vencer">Por vencer</option>
            <option value="vencida">Vencida</option>
            <option value="sin_registro">Sin membresía</option>
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Desliza un registro hacia la izquierda para editarlo o eliminarlo.
      </p>

      <div className="mt-2 min-h-0 overflow-y-auto overscroll-contain rounded-2xl border bg-card">
        {visibleUsers.length ? (
          <ul className="divide-y">
            {visibleUsers.map((user) => {
              if (user.role === "superadmin") {
                return (
                  <li
                    key={user.id}
                    className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                  >
                    <UserContent user={user} />
                    <span className="grid size-9 place-items-center rounded-full bg-secondary text-muted-foreground" title="Cuenta protegida">
                      <LockKeyhole className="size-4" />
                    </span>
                  </li>
                );
              }

              return (
                <SwipeUserRow
                  key={user.id}
                  user={user}
                  open={openUserId === user.id}
                  onOpenChange={(open) => setOpenUserId(open ? user.id : null)}
                  onDelete={() => {
                    setOpenUserId(null);
                    setDeletingUser(user);
                  }}
                />
              );
            })}
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            No hay usuarios que coincidan.
          </p>
        )}
      </div>

      {deletingUser ? (
        <DeleteUserDialog
          key={deletingUser.id}
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
        />
      ) : null}
    </div>
  );
}
