"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const subscribeNever = () => () => undefined;

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function subscribeToDisplayMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isIos = useSyncExternalStore(subscribeNever, isIosDevice, () => false);
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalone,
    () => true
  );

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    setDismissed(outcome !== "accepted");
  }

  if (dismissed || standalone || (!isIos && !installPrompt)) return null;

  return (
    <aside
      aria-label="Instalar HipsApp"
      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-20 mx-auto max-w-md rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl sm:bottom-6"
    >
      <button
        type="button"
        aria-label="Cerrar aviso de instalación"
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 rounded-full p-1 text-background/70 hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-3 pr-5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Download className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Instala HipsApp</p>
          {isIos ? (
            <p className="text-sm text-background/75">
              Toca <Share className="inline size-3" aria-hidden="true" /> y luego
              &nbsp;“Agregar a inicio”.
            </p>
          ) : (
            <p className="text-sm text-background/75">Ábrela en pantalla completa.</p>
          )}
        </div>
        {!isIos && (
          <button
            type="button"
            onClick={install}
            className="ml-auto min-h-10 shrink-0 rounded-xl bg-background px-3 text-sm font-semibold text-foreground hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            Instalar
          </button>
        )}
      </div>
    </aside>
  );
}
