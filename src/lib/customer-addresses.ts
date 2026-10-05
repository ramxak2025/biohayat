import { prisma } from "@/lib/prisma";
import type { CustomerAddress } from "@prisma/client";

type AddressInput = Partial<Pick<CustomerAddress, "label" | "recipient" | "phone" | "city" | "street" | "house" | "apartment" | "comment" | "isDefault">>;
export class AddressError extends Error {}
/** All clients serialize writes on the owner, including the first-address case. */
export async function writeAddress(customerId: string, operation: "create" | "update" | "delete", input: AddressInput = {}, id?: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Customer" WHERE id = ${customerId} FOR UPDATE`;
    const own = id ? await tx.customerAddress.findFirst({ where: { id, customerId } }) : null;
    if (operation !== "create" && !own) throw new AddressError("Адрес не найден");
    const count = await tx.customerAddress.count({ where: { customerId } });
    if (operation === "create" && count >= 20) throw new AddressError("Можно сохранить не более 20 адресов");
    if (operation === "delete") {
      await tx.customerAddress.delete({ where: { id: own!.id } });
    } else {
      const makeDefault = input.isDefault === true || count === 0;
      if (makeDefault) await tx.customerAddress.updateMany({ where: { customerId }, data: { isDefault: false } });
      if (operation === "create") {
        if (!input.city || !input.street) throw new AddressError("Укажите город и улицу");
        return tx.customerAddress.create({ data: { ...input, city: input.city, street: input.street, customerId, isDefault: makeDefault } });
      }
      // Do not clear the only default with a partial PATCH.
      await tx.customerAddress.update({ where: { id: own!.id }, data: { ...input, isDefault: makeDefault || (own!.isDefault && input.isDefault !== true) } });
    }
    const defaultAddress = await tx.customerAddress.findFirst({ where: { customerId, isDefault: true } });
    if (!defaultAddress) {
      const next = await tx.customerAddress.findFirst({ where: { customerId }, orderBy: { createdAt: "desc" } });
      if (next) await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return operation === "delete" ? null : tx.customerAddress.findUniqueOrThrow({ where: { id: own!.id } });
  });
}
