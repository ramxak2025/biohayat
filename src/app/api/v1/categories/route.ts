// GET /api/v1/categories — активные корневые категории с активными подкатегориями.

import { prisma } from "@/lib/prisma";
import { apiOk, withErrorHandling } from "../_lib/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return apiOk(
    categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.image,
      icon: c.icon,
      children: c.children.map((ch) => ({
        id: ch.id,
        slug: ch.slug,
        name: ch.name,
        description: ch.description,
        image: ch.image,
        icon: ch.icon,
      })),
    })),
  );
});
