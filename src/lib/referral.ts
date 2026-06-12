import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Реферальная программа «пригласи друга».
 *
 * У каждого покупателя есть персональный код (генерируется лениво при первом
 * заходе в раздел «Друзья»). Новый покупатель может ввести код пригласившего
 * — тогда за его ПЕРВЫЙ доставленный заказ бонус начисляется обоим.
 *
 * Уникальность referralCode обеспечивается в коде (findFirst + повторные
 * попытки при коллизии), т.к. в схеме поле без @unique.
 */

/** Бонус за приведённого друга — обоим участникам (300 ₽ = 30000 копеек). */
export const REFERRAL_BONUS_KOPECKS = 30000;

const CODE_PREFIX = "HAYAT";

/** Короткий код вида "HAYAT" + 6 символов base36 в верхнем регистре. */
function randomCode(): string {
  // 6 символов base36 ≈ 2 млрд комбинаций — достаточно при проверке коллизий.
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return CODE_PREFIX + suffix;
}

/**
 * Генерирует уникальный реферальный код и сохраняет его покупателю.
 * До 5 попыток на случай коллизии. Возвращает выданный код.
 */
export async function generateReferralCode(customerId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const clash = await prisma.customer.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (clash) continue;
    await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } });
    return code;
  }
  // Крайне маловероятный фолбэк: добавляем хвост от id, чтобы гарантировать уникальность.
  const code = `${CODE_PREFIX}${customerId.slice(-6).toUpperCase()}`;
  await prisma.customer.update({ where: { id: customerId }, data: { referralCode: code } });
  return code;
}

/** Возвращает существующий код покупателя либо создаёт новый. */
export async function ensureReferralCode(customerId: string): Promise<string> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { referralCode: true },
  });
  if (customer?.referralCode) return customer.referralCode;
  return generateReferralCode(customerId);
}

export type ApplyReferralResult = { ok: true } | { ok: false; error: string };

/**
 * Привязывает покупателя к пригласившему по коду.
 * Проверки: код существует, не свой собственный, покупатель ещё не привязан.
 */
export async function applyReferral(customerId: string, codeRaw: string): Promise<ApplyReferralResult> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Введите код друга" };

  const me = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { referredById: true, referralCode: true },
  });
  if (!me) return { ok: false, error: "Аккаунт не найден" };
  if (me.referredById) return { ok: false, error: "Вы уже активировали код друга" };
  if (me.referralCode && me.referralCode.toUpperCase() === code) {
    return { ok: false, error: "Нельзя ввести собственный код" };
  }

  const owner = await prisma.customer.findFirst({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!owner) return { ok: false, error: "Код не найден" };
  if (owner.id === customerId) return { ok: false, error: "Нельзя ввести собственный код" };

  await prisma.customer.update({
    where: { id: customerId },
    data: { referredById: owner.id },
  });
  return { ok: true };
}

type Tx = Prisma.TransactionClient;

/**
 * Начисляет реферальный бонус обоим участникам, когда у приглашённого
 * покупателя завершается его ПЕРВЫЙ доставленный заказ.
 *
 * Вызывается из accrueOrderBonus внутри той же транзакции. Идемпотентность:
 *  - привязка к покупателю (referredById) проверяется по самому покупателю;
 *  - повтор исключается проверкой отсутствия прежней referral-транзакции
 *    у приглашённого (на каждого приглашённого бонус выдаётся однократно).
 */
export async function rewardReferralOnFirstOrder(tx: Tx, orderId: string): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { customerId: true },
  });
  if (!order?.customerId) return;

  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { id: true, referredById: true },
  });
  if (!customer?.referredById) return;

  // Идемпотентность: реферальный бонус приглашённому выдаётся один раз.
  const already = await tx.bonusTransaction.findFirst({
    where: { customerId: customer.id, reason: "referral" },
    select: { id: true },
  });
  if (already) return;

  // Бонус только за ПЕРВЫЙ ОПЛАЧЕННЫЙ заказ (PAID и далее). accrueOrderBonus уже «занял»
  // флаг bonusAccrued для текущего заказа, поэтому этот заказ учтён в count.
  const deliveredCount = await tx.order.count({
    where: { customerId: customer.id, status: { in: ["PAID", "ASSEMBLING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] } },
  });
  if (deliveredCount !== 1) return;

  const referrerId = customer.referredById;

  // Начисляем обоим: приглашённому и пригласившему.
  await tx.customer.update({
    where: { id: customer.id },
    data: { bonusKopecks: { increment: REFERRAL_BONUS_KOPECKS } },
  });
  await tx.bonusTransaction.create({
    data: {
      customerId: customer.id,
      amountKopecks: REFERRAL_BONUS_KOPECKS,
      reason: "referral",
      orderId,
      note: "Бонус за участие в реферальной программе",
    },
  });

  await tx.customer.update({
    where: { id: referrerId },
    data: { bonusKopecks: { increment: REFERRAL_BONUS_KOPECKS } },
  });
  await tx.bonusTransaction.create({
    data: {
      customerId: referrerId,
      amountKopecks: REFERRAL_BONUS_KOPECKS,
      reason: "referral",
      orderId,
      note: "Бонус за приглашённого друга",
    },
  });
}
