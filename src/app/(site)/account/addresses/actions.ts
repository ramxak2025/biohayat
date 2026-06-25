"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer-auth";

export type AddressState = { ok?: boolean; error?: string };

/** Проверяет, что адрес принадлежит текущему клиенту. */
async function assertOwnAddress(addressId: string, customerId: string): Promise<void> {
  const addr = await prisma.address.findUnique({
    where: { id: addressId },
    select: { customerId: true },
  });
  if (!addr || addr.customerId !== customerId) throw new Error("FORBIDDEN");
}

/** Собирает поля адреса из формы с валидацией обязательных. */
function parseAddress(fd: FormData): { error?: string; data?: {
  label: string | null; recipient: string | null; phone: string | null;
  city: string; street: string; house: string | null; apartment: string | null;
  comment: string | null; isDefault: boolean;
} } {
  const city = String(fd.get("city") || "").trim();
  const street = String(fd.get("street") || "").trim();
  if (!city) return { error: "Укажите город" };
  if (!street) return { error: "Укажите улицу" };
  return {
    data: {
      label: String(fd.get("label") || "").trim() || null,
      recipient: String(fd.get("recipient") || "").trim() || null,
      phone: String(fd.get("phone") || "").trim() || null,
      city,
      street,
      house: String(fd.get("house") || "").trim() || null,
      apartment: String(fd.get("apartment") || "").trim() || null,
      comment: String(fd.get("comment") || "").trim() || null,
      isDefault: fd.get("isDefault") === "on",
    },
  };
}

export async function createAddress(_prev: AddressState, fd: FormData): Promise<AddressState> {
  const session = await requireCustomer();
  const parsed = parseAddress(fd);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  // Первый адрес делаем адресом по умолчанию автоматически.
  const count = await prisma.address.count({ where: { customerId: session.sub } });
  const isDefault = parsed.data.isDefault || count === 0;

  if (isDefault) {
    await prisma.address.updateMany({ where: { customerId: session.sub }, data: { isDefault: false } });
  }
  await prisma.address.create({ data: { ...parsed.data, isDefault, customerId: session.sub } });

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function updateAddress(_prev: AddressState, fd: FormData): Promise<AddressState> {
  const session = await requireCustomer();
  const id = String(fd.get("id") || "");
  if (!id) return { error: "Адрес не найден" };
  await assertOwnAddress(id, session.sub);

  const parsed = parseAddress(fd);
  if (parsed.error || !parsed.data) return { error: parsed.error };

  if (parsed.data.isDefault) {
    await prisma.address.updateMany({ where: { customerId: session.sub }, data: { isDefault: false } });
  }
  await prisma.address.update({ where: { id }, data: parsed.data });

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<void> {
  const session = await requireCustomer();
  await assertOwnAddress(id, session.sub);
  const addr = await prisma.address.findUnique({ where: { id }, select: { isDefault: true } });
  await prisma.address.delete({ where: { id } });

  // Если удалили адрес по умолчанию — назначаем им самый свежий из оставшихся.
  if (addr?.isDefault) {
    const next = await prisma.address.findFirst({
      where: { customerId: session.sub },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/account/addresses");
}

export async function setDefault(id: string): Promise<void> {
  const session = await requireCustomer();
  await assertOwnAddress(id, session.sub);
  await prisma.address.updateMany({ where: { customerId: session.sub }, data: { isDefault: false } });
  await prisma.address.update({ where: { id }, data: { isDefault: true } });
  revalidatePath("/account/addresses");
}
