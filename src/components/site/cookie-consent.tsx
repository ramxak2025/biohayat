"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "hayat_cookie_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-mobnav)+max(12px,env(safe-area-inset-bottom)))] z-30 px-3 lg:bottom-4">
      <div className="animate-fade-up pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface p-3 shadow-lg ring-1 ring-line">
        <p className="flex-1 text-xs leading-snug text-ink-muted">
          Пользуясь сайтом, вы соглашаетесь с{" "}
          <Link href="/privacy-policy" className="font-medium text-brand-700 underline">
            политикой конфиденциальности
          </Link>{" "}
          и использованием cookie.
        </p>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setShow(false);
          }}
        >
          Хорошо
        </Button>
      </div>
    </div>
  );
}
