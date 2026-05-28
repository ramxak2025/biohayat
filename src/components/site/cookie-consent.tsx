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
    <div className="pb-safe fixed inset-x-0 bottom-[calc(var(--spacing-mobnav)+0.5rem)] z-30 px-3 lg:bottom-4">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 rounded-2xl bg-ink/95 p-4 text-sm text-white shadow-lg backdrop-blur sm:flex-row">
        <p className="flex-1 text-white/90">
          Мы используем файлы cookie для корректной работы сайта и аналитики. Продолжая
          пользоваться сайтом, вы соглашаетесь с{" "}
          <Link href="/privacy-policy" className="underline">политикой конфиденциальности</Link>.
        </p>
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setShow(false);
          }}
        >
          Принять
        </Button>
      </div>
    </div>
  );
}
