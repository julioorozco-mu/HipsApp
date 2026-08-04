"use client";

import {
  CircleCheckBig,
  Download,
  Share,
  Smartphone,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaSnapshot = {
  canInstall: boolean;
  installed: boolean;
};

const INSTALL_REQUEST_EVENT = "hipsapp:request-install";
const INSTALLED_STORAGE_KEY = "hipsapp:pwa-installed";
const SERVER_SNAPSHOT: PwaSnapshot = { canInstall: false, installed: false };
const BANNER_DURATION_MS = 20_000;
const BANNER_EXIT_MS = 320;
const pwaListeners = new Set<() => void>();
let pwaSnapshot = SERVER_SNAPSHOT;
let installBannerShownThisLoad = false;

const subscribeNever = () => () => undefined;

function updatePwaSnapshot(next: Partial<PwaSnapshot>) {
  const updated = { ...pwaSnapshot, ...next };
  if (
    updated.canInstall === pwaSnapshot.canInstall &&
    updated.installed === pwaSnapshot.installed
  ) {
    return;
  }

  pwaSnapshot = updated;
  pwaListeners.forEach((listener) => listener());
}

function subscribePwaStatus(listener: () => void) {
  pwaListeners.add(listener);
  return () => pwaListeners.delete(listener);
}

function getPwaSnapshot() {
  return pwaSnapshot;
}

function getPwaServerSnapshot() {
  return SERVER_SNAPSHOT;
}

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

function isInstalledDisplayMode() {
  return (
    window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    ).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readStoredInstallation() {
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function storeInstallation(installed: boolean) {
  try {
    if (installed) {
      window.localStorage.setItem(INSTALLED_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
    }
  } catch {
    // El estado visual sigue funcionando por display-mode aunque el storage falle.
  }
}

function subscribeToDisplayMode(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export function PwaStatus() {
  const { canInstall, installed } = useSyncExternalStore(
    subscribePwaStatus,
    getPwaSnapshot,
    getPwaServerSnapshot
  );
  const Icon = installed ? CircleCheckBig : Smartphone;

  function requestInstallation() {
    window.dispatchEvent(new Event(INSTALL_REQUEST_EVENT));
  }

  return (
    <section
      aria-label={`PWA ${installed ? "instalada" : "no instalada"}`}
      className={`mt-7 rounded-3xl px-5 py-4 ${
        installed
          ? "bg-[oklch(0.94_0.08_125)]"
          : "bg-[oklch(0.95_0.035_300)]"
      }`}
    >
      <div className="flex min-h-16 items-center gap-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${
            installed
              ? "bg-[oklch(0.5_0.16_150)] text-[oklch(0.985_0.006_150)]"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {installed ? "HipsApp instalada" : "Instalar HipsApp"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {installed
              ? "Disponible como aplicación en este dispositivo"
              : canInstall
                ? "Chrome tiene listo el instalador de la aplicación"
                : "Chrome habilitará la instalación cuando esté disponible"}
          </p>
        </div>
      </div>

      {!installed && canInstall ? (
        <button
          type="button"
          onClick={requestInstallation}
          className="mt-4 min-h-11 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Instalar HipsApp
        </button>
      ) : null}
    </section>
  );
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const installPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [dismissed, setDismissed] = useState(
    () => installBannerShownThisLoad
  );
  const [closing, setClosing] = useState(false);
  const isIos = useSyncExternalStore(subscribeNever, isIosDevice, () => false);
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalone,
    () => true
  );

  const dismissBanner = useCallback(() => {
    if (dismissed || closing) return;

    setClosing(true);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setDismissed(true);
      setClosing(false);
      closeTimerRef.current = null;
    }, BANNER_EXIT_MS);
  }, [closing, dismissed]);

  const install = useCallback(async () => {
    const prompt = installPromptRef.current;
    if (!prompt) return;

    await prompt.prompt();
    await prompt.userChoice;
    installPromptRef.current = null;
    setInstallPrompt(null);
    updatePwaSnapshot({ canInstall: false });
    dismissBanner();
  }, [dismissBanner]);

  useEffect(() => {
    const displayMode = window.matchMedia(
      "(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)"
    );

    const syncInstalled = () => {
      const installed = isInstalledDisplayMode() || readStoredInstallation();
      updatePwaSnapshot({ installed });
    };
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      const prompt = event as BeforeInstallPromptEvent;
      installPromptRef.current = prompt;
      setInstallPrompt(prompt);
      storeInstallation(false);
      updatePwaSnapshot({ canInstall: true, installed: false });

      if (!installBannerShownThisLoad) {
        installBannerShownThisLoad = true;
        setDismissed(false);
        setClosing(false);
      }
    };
    const handleInstalled = () => {
      installPromptRef.current = null;
      setInstallPrompt(null);
      setDismissed(true);
      setClosing(false);
      storeInstallation(true);
      updatePwaSnapshot({ canInstall: false, installed: true });
    };
    const handleInstallRequest = () => {
      void install();
    };

    syncInstalled();
    displayMode.addEventListener("change", syncInstalled);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(INSTALL_REQUEST_EVENT, handleInstallRequest);

    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      displayMode.removeEventListener("change", syncInstalled);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(INSTALL_REQUEST_EVENT, handleInstallRequest);
    };
  }, [install]);

  useEffect(() => {
    if (!isIos || standalone || installBannerShownThisLoad) return;
    installBannerShownThisLoad = true;
    setDismissed(false);
  }, [isIos, standalone]);

  useEffect(() => {
    if (dismissed || closing || standalone || (!isIos && !installPrompt)) {
      return;
    }

    const timeout = window.setTimeout(dismissBanner, BANNER_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [closing, dismissBanner, dismissed, installPrompt, isIos, standalone]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  if (dismissed || standalone || (!isIos && !installPrompt)) return null;

  return (
    <aside
      aria-label="Instalar HipsApp"
      className={`fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+7.25rem)] z-40 mx-auto max-w-md rounded-2xl bg-foreground px-4 py-3 text-background shadow-xl transition-[transform,opacity] ease-in motion-reduce:animate-none motion-reduce:transition-none sm:bottom-6 ${
        closing
          ? "translate-y-[calc(100%+8rem)] opacity-0 duration-300"
          : "translate-y-0 opacity-100 animate-in duration-500 fade-in slide-in-from-bottom-8"
      }`}
    >
      <button
        type="button"
        aria-label="Cerrar aviso de instalación"
        onClick={dismissBanner}
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
