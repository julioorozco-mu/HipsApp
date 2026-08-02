export type AppRole = "superadmin" | "admin" | "alumno";

export function normalizeRole(role: string | null | undefined): AppRole {
  if (role === "superadmin") return "superadmin";
  if (role === "alumno") return "alumno";
  return "admin";
}

export function roleLabel(role: AppRole) {
  if (role === "superadmin") return "Superadmin";
  if (role === "alumno") return "Alumno";
  return "Administrador";
}

export function canManageOperations(role: AppRole) {
  return role === "superadmin" || role === "admin";
}
