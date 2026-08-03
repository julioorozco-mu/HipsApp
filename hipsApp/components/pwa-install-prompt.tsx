"use client";

import { CircleCheckBig, Download, Share, Smartphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type PwaInstallContextValue = {
  canInstall: boolean;
  installed: boolean;
  installing: boolean;
  isIos: boolean;
  ready: boolean;
  install: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    ).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    );
    const syncInstalled = () => setInstalled(isStandalone());
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    setIsIos(isIosDevice());
    syncInstalled();
    setReady(true);

    media.addEventListener("change", syncInstalled);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      media.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install(): Promise<InstallOutcome> {
    if (!installPrompt) return "unavailable";

    setInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (outcome === "accepted") setInstalled(true);
      return outcome;
    } finally {
      setInstalling(false);
    }
  }

  return (
    <PwaInstallContext.Provider
      value={{
        canInstall: Boolean(installPrompt),
        installed,
        installing,
        isIos,
        ready,
        install,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const value = useContext(PwaInstallContext);
  if (!value) {
    throw new Error("usePwaInstall debe usarse dentro de PwaInstallProvider.");
  }
  return value;
}

export function PwaStatus() {
  const { installed, ready } = usePwaInstall();
  const Icon = installed ? CircleCheckBig : Smartphone;

  return (
    <section
      aria-label={`PWA ${installed ? "instalada" : "no instalada"}`}
      className={`mt-7 flex min-h-24 items-center gap-4 rounded-3xl px-5 py-4 ${
        installed
          ? "bg-[oklch(0.94_0.08_125)]"
          : "bg-[oklch(0.95_0.035_300)]"
      }`}
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-full ${
          installed
            ? "bg-[oklch(0.5_0.16_150)] text-[oklch(0.985_0.006_150)]"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="size-6" />
      </span>
      <div>
        <h2 className="text-lg font-semibold">
          PWA {installed ? "instalada" : "no instalada"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {installed
            ? "Accede rápido desde tu pantalla de inicio"
            : ready
              ? "Instálala como aplicación desde HipsApp"
              : "Comprobando instalación…"}
        </p>
      </div>
    </section>
  );
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const { canInstall, installed, installing, isIos, ready, install } =
    usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  async function handleInstall() {
    const outcome = await install();
    if (outcome !== "unavailable") setDismissed(true);
  }

  if (
    pathname === "/instalar" ||
    !ready ||
    dismissed ||
    installed ||
    (!isIos && !canInstall)
  ) {
    return null;
  }

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
              En Safari toca <Share className="inline size-3" aria-hidden="true" /> y
              luego “Agregar a inicio”.
            </p>
          ) : (
            <p className="text-sm text-background/75">
              Usa el instalador nativo para abrirla como aplicación.
            </p>
          )}
        </div>
        {!isIos ? (
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="ml-auto min-h-10 shrink-0 rounded-xl bg-background px-3 text-sm font-semibold text-foreground hover:bg-background/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background"
          >
            {installing ? "Abriendo…" : "Instalar"}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
