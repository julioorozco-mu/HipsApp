"use client";

import { CheckCircle2, Clock3, Download, RefreshCw, Share2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPwaCard() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const capture = (value: Event) => {
      value.preventDefault();
      setEvent(value as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setEvent(null);
    };

    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, []);

  async function install() {
    if (!event) {
      setMessage(
        "En iPhone usa Compartir → Agregar a pantalla de inicio. En Android abre el menú del navegador → Instalar aplicación."
      );
      return;
    }

    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setEvent(null);
  }

  return (
    <div className="flex flex-1 flex-col text-center">
      <div className="mx-auto grid size-24 place-items-center rounded-3xl bg-primary text-primary-foreground">
        <Smartphone className="size-12" />
      </div>
      <h2 className="mt-6 text-2xl font-bold">
        Instala HipsApp en tu dispositivo
      </h2>
      <p className="mt-2 text-muted-foreground">
        Disfruta una experiencia rápida, directa y en pantalla completa.
      </p>
      <div className="mt-7 grid gap-3 text-left">
        <Feature
          icon={Download}
          title="Acceso rápido"
          text="Abre HipsApp desde tu pantalla de inicio"
        />
        <Feature
          icon={Clock3}
          title="Funciona como app"
          text="Navegación fluida sin abrir el navegador"
        />
        <Feature
          icon={RefreshCw}
          title="Actualizaciones automáticas"
          text="Siempre tendrás la última versión"
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
        onClick={install}
        disabled={installed}
        className="mt-auto min-h-13 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:bg-green-600"
      >
        {installed ? (
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="size-5" />
            HipsApp instalada
          </span>
        ) : (
          "Instalar HipsApp"
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
