import type { Customer } from "@prisma/client";
import { getApiCustomer } from "@/lib/api/token";
import { prisma } from "@/lib/prisma";

/**
 * Покупатель по Bearer-токену — с проверкой, что он ещё жив.
 *
 * Раньше bearer-роуты доверяли одному лишь токену: заблокированный
 * (`isActive = false`) или удалённый покупатель продолжал работать до истечения
 * 30-дневного JWT. Отзывать токены нечем (модели RefreshToken нет), поэтому
 * единственная точка проверки — обращение к БД на каждом запросе.
 *
 * Возвращает null во всех трёх случаях (нет токена / нет покупателя /
 * деактивирован): наружу они неразличимы, все три дают 401.
 */
export async function getActiveCustomer(req: Request): Promise<Customer | null> {
  const session = await getApiCustomer(req);
  if (!session) return null;
  const customer = await prisma.customer.findUnique({ where: { id: session.sub } });
  if (!customer || !customer.isActive || customer.deletedAt) return null;
  return customer;
}
