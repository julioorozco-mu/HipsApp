"use client";

import { useRef, useState } from "react";

import { saveTemplate } from "@/app/actions/more";
import { ActionForm, fieldClass } from "@/components/features/more/action-form";

const variables = ["{{nombre}}", "{{clase}}", "{{hora}}", "{{fecha}}"];

function preview(message: string) {
  return message
    .replaceAll("{{nombre}}", "Ana")
    .replaceAll("{{clase}}", "Zumba")
    .replaceAll("{{hora}}", "7:00 p. m.")
    .replaceAll("{{fecha}}", "15 de agosto")
    .replaceAll("{nombre}", "Ana")
    .replaceAll("{clase}", "Zumba")
    .replaceAll("{hora}", "7:00 p. m.")
    .replaceAll("{fecha}", "15 de agosto");
}

export function TemplateForm({
  template,
}: {
  template?: { body: string; id: string; kind?: string; name: string };
}) {
  const action = saveTemplate.bind(null, template?.id ?? null);
  const [message, setMessage] = useState(template?.body ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(variable: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? message.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${message.slice(0, start)}${variable}${message.slice(end)}`;
    setMessage(next);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const caret = start + variable.length;
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  }

  return (
    <ActionForm action={action} label="Guardar plantilla">
      <label className="grid gap-2 text-sm font-semibold">
        Nombre de la plantilla
        <input
          className={fieldClass}
          name="name"
          defaultValue={template?.name ?? ""}
          placeholder="Recordatorio de clase"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold">
        Tipo
        <select className={fieldClass} name="kind" defaultValue={template?.kind ?? "recordatorio"}>
          <option value="recordatorio">Recordatorio</option>
          <option value="pago">Aviso de pago</option>
          <option value="confirmacion">Confirmación de pago</option>
          <option value="otro">Otro</option>
        </select>
      </label>

      <div className="grid gap-2">
        <label htmlFor="template-message" className="text-sm font-semibold">Mensaje</label>
        <textarea
          id="template-message"
          ref={textareaRef}
          className="min-h-36 w-full resize-y rounded-xl border bg-card p-4 outline-none focus:border-primary focus:ring-3 focus:ring-ring/25"
          name="body"
          maxLength={400}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Hola {{nombre}}, te recordamos que tu clase de {{clase}} es hoy a las {{hora}}."
          required
        />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Inserta una variable en la posición del cursor.</span>
          <span>{message.length}/400</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary"
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 rounded-2xl bg-[#eaf7e9] p-4">
        <p className="text-xs font-semibold text-green-800">Vista previa (WhatsApp)</p>
        <p className="mt-2 min-h-16 max-w-full whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-sm">
          {preview(message) || "El mensaje aparecerá aquí mientras escribes."}
        </p>
      </div>
    </ActionForm>
  );
}
