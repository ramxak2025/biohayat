import type { Prisma } from "@prisma/client";

/** Return only a recorded reservation, once, even when two clients cancel. */
export async function restoreReservedStock(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId, stockReserved: { gt: 0 } }, orderBy: { productId: "asc" } });
  for (const item of items) {
    const claim = await tx.orderItem.updateMany({ where: { id: item.id, stockReserved: item.stockReserved }, data: { stockReserved: 0 } });
    if (!claim.count || !item.productId) continue;
    await tx.product.updateMany({ where: { id: item.productId, stockQty: { not: null } }, data: { stockQty: { increment: item.stockReserved } } });
    await tx.product.updateMany({ where: { id: item.productId, stockQty: { gt: 0 }, inStock: false }, data: { inStock: true } });
  }
}
