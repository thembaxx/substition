"use client";
import { useEffect, useState } from "react";
import { ArrowClockwise, DownloadSimple, WifiSlash, X } from "@phosphor-icons/react";
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
export default function NativeSupport({
  onInstallReady,
}: {
  onInstallReady?: (install: (() => void) | null) => void;
}) {
  const [offline, setOffline] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const connection = () => setOffline(!navigator.onLine);
    connection();
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    const installed = () => {
      setPrompt(null);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", installed);
    let mounted = true;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (!mounted) return;
          if (reg.waiting) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (mounted && worker.state === "installed" && navigator.serviceWorker.controller)
                setWaiting(worker);
            });
          });
        })
        .catch(() => {
          /* Browsers can disable service workers; vault mode still works. */
        });
    return () => {
      mounted = false;
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);
  useEffect(() => {
    onInstallReady?.(
      prompt
        ? () => {
            void prompt.prompt();
          }
        : null,
    );
  }, [prompt, onInstallReady]);
  return (
    <>
      {offline && (
        <div className="connection-banner" role="status">
          <WifiSlash size={16} /> Offline. Your vault still works on this device.
        </div>
      )}
      {waiting && (
        <div className="update-banner" role="status">
          <ArrowClockwise size={18} />
          <span>A fresh version is ready. Save changes before refreshing.</span>
          <button
            onClick={() => {
              waiting.postMessage("SKIP_WAITING");
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
            }}
          >
            Update
          </button>
          <button aria-label="Dismiss update" onClick={() => setWaiting(null)}>
            <X />
          </button>
        </div>
      )}
      {prompt && !dismissed && (
        <button
          className="install-floating"
          onClick={async () => {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            if (choice.outcome === "accepted") setPrompt(null);
            else setDismissed(true);
          }}
        >
          <DownloadSimple size={17} /> Add to your home screen
        </button>
      )}
    </>
  );
}
