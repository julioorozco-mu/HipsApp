import { changePassword } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";
import { MoreShell } from "@/components/features/more/more-shell";

export default function ChangePasswordPage() {
  return (
    <MoreShell title="Cambiar contraseña" backHref="/perfil">
      <ActionForm action={changePassword} label="Actualizar contraseña">
        <label className="grid gap-2 text-sm font-semibold">
          Nueva contraseña
          <input
            className={fieldClass}
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
          <span className="font-normal text-muted-foreground">
            Usa al menos 8 caracteres.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Confirmar contraseña
          <input
            className={fieldClass}
            name="password_confirmation"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </label>
      </ActionForm>
    </MoreShell>
  );
}
