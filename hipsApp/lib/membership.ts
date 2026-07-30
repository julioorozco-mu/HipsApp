export type MembershipStatus = "activa" | "por_vencer" | "vencida" | "sin_registro";

const POR_VENCER_THRESHOLD_DAYS = 3;

export function getMembershipStatus(
  fechaVencimiento: string | null | undefined
): MembershipStatus {
  if (!fechaVencimiento) return "sin_registro";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vencimiento = new Date(`${fechaVencimiento}T00:00:00`);
  const diffDays = Math.ceil(
    (vencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "vencida";
  if (diffDays <= POR_VENCER_THRESHOLD_DAYS) return "por_vencer";
  return "activa";
}

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  activa: "Activa",
  por_vencer: "Por vencer",
  vencida: "Vencida",
  sin_registro: "Sin registro",
};

export const MEMBERSHIP_STATUS_BADGE_CLASS: Record<MembershipStatus, string> = {
  activa:
    "bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  por_vencer:
    "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  vencida: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  sin_registro: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};
