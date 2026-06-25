import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 12 * 1024 * 1024; // 12 МБ

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл больше 12 МБ" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Можно загружать только изображения" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await mkdir(UPLOAD_DIR, { recursive: true });

  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
  const outPath = path.join(UPLOAD_DIR, name);

  try {
    // Проверяем, что это реальное растровое изображение, и конвертируем в WebP.
    // НЕ доверяем заявленному client-у типу файла — полагаемся на разбор sharp.
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) {
      return NextResponse.json({ error: "Файл не является изображением" }, { status: 400 });
    }
    await sharp(buffer)
      .rotate()
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
  } catch {
    // Не сохраняем сырой/неизвестный буфер (защита от загрузки произвольных файлов).
    return NextResponse.json(
      { error: "Не удалось обработать изображение. Загрузите JPG, PNG или WebP." },
      { status: 400 },
    );
  }

  return NextResponse.json({ url: `/uploads/${name}` });
}
