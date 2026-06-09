"use client";

import { useState } from "react";
import { Input } from "@/components/ui/field";

/** Форматирует ввод в маску +7 (___) ___-__-__ (только цифры РФ). */
export function formatPhoneMask(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (!d) return "";
  // ведущие 7/8 — код страны, отбрасываем
  if (d[0] === "7" || d[0] === "8") d = d.slice(1);
  d = d.slice(0, 10);
  if (!d) return "";
  let res = `+7 (${d.slice(0, 3)}`;
  if (d.length >= 4) res += `) ${d.slice(3, 6)}`;
  if (d.length >= 7) res += `-${d.slice(6, 8)}`;
  if (d.length >= 9) res += `-${d.slice(8, 10)}`;
  return res;
}

/** Телефон заполнен полностью (10 цифр после +7)? */
export function isPhoneComplete(value: string): boolean {
  return value.replace(/\D/g, "").length === 11;
}

/**
 * Контролируемый input с маской +7 (___) ___-__-__ без сторонних библиотек.
 * Значение отправляется в форму через атрибут name в отформатированном виде.
 */
export function PhoneInput({
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "defaultValue"> & {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(() => formatPhoneMask(defaultValue ?? ""));
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      placeholder="+7 (___) ___-__-__"
      value={value}
      onChange={(e) => {
        const next = formatPhoneMask(e.target.value);
        setValue(next);
        onValueChange?.(next);
      }}
    />
  );
}
