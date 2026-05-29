"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Загрузчик изображений для админки. Поддерживает несколько файлов.
 * Возвращает массив URL через скрытые поля name[].
 * `spec` — рекомендованный размер (выводится подсказкой), `ratio` — превью.
 */
export function ImageUploader({
  name,
  initial = [],
  multiple = false,
  spec,
  ratio = "1/1",
}: {
  name: string;
  initial?: string[];
  multiple?: boolean;
  spec?: string;
  ratio?: string;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList) {
    setLoading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ошибка загрузки");
        uploaded.push(data.url);
      }
      setUrls((prev) => (multiple ? [...prev, ...uploaded] : uploaded.slice(-1)));
      toast.success("Изображение загружено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <div className="flex flex-wrap gap-3">
        {urls.map((u) => (
          <div
            key={u}
            className="relative overflow-hidden rounded-xl ring-1 ring-line"
            style={{ aspectRatio: ratio.replace("/", " / "), width: 110 }}
          >
            <Image src={u} alt="" fill className="object-cover" sizes="110px" />
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-white"
              aria-label="Удалить"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {(multiple || urls.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line-strong text-ink-faint transition hover:border-brand-400 hover:text-brand-600",
            )}
            style={{ aspectRatio: ratio.replace("/", " / "), width: 110 }}
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-[10px] font-semibold">Загрузить</span>
          </button>
        )}
      </div>
      {spec ? <p className="mt-1.5 text-xs text-ink-faint">Рекомендуемый размер: {spec}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
    </div>
  );
}
