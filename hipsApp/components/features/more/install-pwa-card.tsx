"use client";

import {
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  Share2,
  Smartphone,
} from "lucide-react";
import { useState } from "react";

import { usePwaInstall } from "@/components/pwa-install-prompt";

export function InstallPwaCard() {
  const { canInstall, installed, installing, isIos, ready, install } =
    usePwaInstall();
  const [message, setMessage] = useState<string | null>(null);

  async function handleInstall() {
    if (isIos) {
      setMessage(
        "En iPhone abre HipsApp en Safari, toca Compartir y elige “Agregar a pantalla de inicio”."
      );
      return;
    }

    if (!canInstall) {
      setMessage(
        "Abre HipsApp en Chrome y actualiza esta página. Espera a que se habilite el instalador; no uses “Agregar a pantalla principal”, porque puede crear solo un acceso directo."
      );
      return;
    }

    const outcome = await install();
    setMessage(
      outcome === "accepted"
        ? "Instalación aceptada. HipsApp se abrirá como una aplicación independiente."
        : outcome === "dismissed"
          ? "La instalación fue cancelada. Puedes intentarlo nuevamente cuando el navegador vuelva a habilitarla."
          : "El instalador todavía no está disponible. Actualiza esta página en Chrome."
    );
  }

  const buttonLabel = installed
    ? "HipsApp instalada"
    : installing
      ? "Abriendo instalador…"
      : isIos
        ? "Cómo instalar HipsApp"
        : canInstall
          ? "Instalar HipsApp"
          : ready
            ? "Revisar instalación"
            : "Preparando instalación…";

  return (
    <div className="flex flex-1 flex-col text-center">
      <div className="mx-auto grid size-24 place-items-center rounded-3xl bg-primary text-primary-foreground">
        <Smartphone className="size-12" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">
        Instala HipsApp en tu dispositivo
      </h2>
      <p className="mt-2 text-muted-foreground">
        Usa el instalador nativo para abrirla sin la interfaz del navegador.
      </p>

      <div className="mt-7 grid gap-3 text-left">
        <Feature
          icon={Download}
          title="Aplicación independiente"
          text="Se instala con su propio icono, no como acceso directo"
        />
        <Feature
          icon={Clock3}
          title="Acceso rápido"
          text="Abre HipsApp desde el cajón de aplicaciones o la pantalla de inicio"
        />
        <Feature
          icon={RefreshCw}
          title="Actualizaciones automáticas"
          text="Siempre tendrás la última versión disponible"
        />
      </div>

      {message ? (
        <p className="mt-5 rounded-xl bg-primary/5 p-4 text-left text-sm text-primary">
          <Share2 className="mr-2 inline size-4" />
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleInstall}
        disabled={installed || installing || !ready}
        className="mt-auto min-h-13 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:bg-green-600 disabled:opacity-80"
      >
        {installed ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-5" />
            {buttonLabel}
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Download;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-primary/5 p-4">
      <Icon className="size-6 shrink-0 text-primary" />
      <div>
        <p className="font-semibold text-primary">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
