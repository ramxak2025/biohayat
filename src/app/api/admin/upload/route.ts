import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSession } from "@/lib/auth";
import { rateLimit, rateLimitRetryAfter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 12 * 1024 * 1024; // 12 МБ

// Allowlist форматов: только растровые изображения, которые обрабатывает sharp.
// SVG не принимаем — может содержать скрипты (stored XSS при прямом открытии).
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  // Rate limit: не более 20 загрузок в минуту на сессию
  const rlKey = `upload:${session.sub}`;
  if (!rateLimit(rlKey, 20, 60_000)) {
    return NextResponse.json(
      { error: `Слишком много загрузок, попробуйте через ${rateLimitRetryAfter(rlKey, 60_000)} с.` },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл больше 12 МБ" }, { status: 400 });
  }
  // Проверка MIME и расширения исходного файла (имя клиента используем
  // только для валидации — в путь сохранения оно не попадает).
  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_MIME.has(file.type) || (ext && !ALLOWED_EXT.has(ext))) {
    return NextResponse.json(
      { error: "Можно загружать только изображения (JPEG, PNG, WebP, GIF, AVIF)" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(UPLOAD_DIR, { recursive: true });

  // Имя генерируется на сервере (timestamp + uuid) — traversal через имя
  // файла невозможен; дополнительно проверяем, что путь остался в UPLOAD_DIR.
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  const outPath = path.resolve(UPLOAD_DIR, name);
  if (!outPath.startsWith(UPLOAD_DIR + path.sep)) {
    return NextResponse.json({ error: "Недопустимое имя файла" }, { status: 400 });
  }

  try {
    // Конвертация в WebP с сохранением размеров (ограничение по ширине 2000px).
    // Заодно валидирует содержимое: не-изображение sharp не обработает.
    await sharp(buffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
  } catch {
    // Содержимое не является поддерживаемым изображением — отклоняем,
    // «сырые» байты на диск не пишем.
    return NextResponse.json({ error: "Файл не является корректным изображением" }, { status: 400 });
  }

  return NextResponse.json({ url: `/uploads/${name}` });
}
