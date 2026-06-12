"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Преобразует base64url VAPID-ключ в Uint8Array для pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

type Status =
  | "checking" // первичная проверка после монтирования
  | "unsupported" // браузер не умеет Web Push
  | "ios-install" // iOS-Safari вне standalone: нужно добавить на главный экран
  | "denied" // уведомления заблокированы пользователем
  | "off"
  | "on";

/** Карточка-переключатель push-напоминаний о приёме БАД. */
export function PushOptIn({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setStatus(isIos && !standalone ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("on");
      toast.success("Напоминания включены");
    } catch {
      toast.error("Не удалось включить напоминания");
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("off");
    } catch {
      toast.error("Не удалось отключить напоминания");
    } finally {
      setBusy(false);
    }
  }

  if (!publicKey) return null;

  const enabled = status === "on";
  const toggleable = status === "on" || status === "off";

  return (
    <div className="animate-fade-up flex items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <BellRing className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">Напоминания о приёме</p>
        <p className="text-xs text-ink-faint">
          {status === "checking" && "Проверяем поддержку…"}
          {status === "unsupported" && "Браузер не поддерживает уведомления"}
          {status === "ios-install" &&
            "Установите сайт на главный экран (Поделиться → «На экран Домой»), чтобы включить напоминания"}
          {status === "denied" && "Уведомления заблокированы — разрешите их в настройках браузера"}
          {status === "off" && "Push-уведомление в момент приёма по расписанию курса"}
          {status === "on" && "Напомним в момент приёма по расписанию курса"}
        </p>
      </div>
      {toggleable && (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Напоминания о приёме"
          disabled={busy}
          onClick={enabled ? disable : enable}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
            "disabled:cursor-not-allowed disabled:opacity-60",
            enabled ? "bg-brand-500" : "bg-surface-sunken ring-1 ring-line-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-xs transition-all duration-300",
              enabled ? "left-6" : "left-1",
            )}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin text-ink-faint" />}
          </span>
        </button>
      )}
    </div>
  );
}
