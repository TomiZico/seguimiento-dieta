import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "dieta-install-banner-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if (isIOS()) setShowIOSHint(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // no-op: solo evita re-mostrar el banner, no es crítico.
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSHint) return null;

  return (
    <div className="mx-auto mt-4 flex max-w-md items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary ring-1 ring-primary/25">
      <Download className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        {deferredPrompt ? (
          <>
            <p>Instalá la app en tu celular para acceder más rápido y recibir los avisos.</p>
            <button
              type="button"
              onClick={handleInstall}
              className="mt-2 rounded-full bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground"
            >
              Instalar
            </button>
          </>
        ) : (
          <p>
            Para instalarla: tocá el ícono de compartir de Safari y elegí{" "}
            <strong>"Agregar a pantalla de inicio"</strong>.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="shrink-0 text-primary/70 hover:text-primary"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
