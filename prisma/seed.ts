import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedCategories } from "./seed-data/categories";
import { seedProducts } from "./seed-data/products";

const prisma = new PrismaClient();

const DISCLAIMER =
  "БАД. НЕ ЯВЛЯЕТСЯ ЛЕКАРСТВЕННЫМ СРЕДСТВОМ. Имеются противопоказания, необходима консультация специалиста.";

function shortDescriptionFor(name: string): string {
  // Многие названия уже содержат пользу после тире — используем её.
  const dashIdx = name.indexOf("—");
  if (dashIdx > 0) {
    const benefit = name.slice(dashIdx + 1).trim();
    const title = name.slice(0, dashIdx).trim();
    return `${title}: ${benefit}. Натуральная продукция ХАЯТ.`;
  }
  return `${name}. Натуральная фитопродукция ХАЯТ для здоровья всей семьи.`;
}

async function main() {
  console.log("🌱 Сидирование БД ХАЯТ…");

  // 1. Настройки сайта
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      siteName: "ХАЯТ",
      phone: "+7 (928) 677-50-50",
      email: "info@biohayat.ru",
      address: "г. Грозный, ул. Нурседы Хабусиевой, 51",
      workingHours: "Пн–Вс, 9:00–18:00",
      instagram: "https://instagram.com/idris_hayat",
      telegram: "https://t.me/hayatru",
      whatsapp: "https://wa.me/79289472424",
      wildberries: "https://wildberries.ru/seller/236894",
      legalName: "ООО «ВОСТОК»",
      inn: "0534052326",
      ogrn: "1190571006636",
      legalAddress: "368001, Республика Дагестан, г. Хасавюрт, ул. Заречная, д. 43 к. А",
      freeDeliveryThresholdKopecks: 2000000,
      badDisclaimer: DISCLAIMER,
      defaultMetaTitle: "ХАЯТ — натуральные витамины и БАД для всей семьи",
      defaultMetaDescription:
        "Фитопродукция и биологически активные добавки ХАЯТ: витамины D3/C/E, коллаген, масло чёрного тмина, мёд и бальзамы. Доставка по России.",
      titleTemplate: "%s — ХАЯТ",
    },
  });

  // 2. Администратор
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@biohayat.ru").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: process.env.ADMIN_NAME || "Администратор",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
  });
  console.log(`👤 Админ: ${adminEmail} / ${adminPassword}`);

  // 3. Категории
  const catIdBySlug = new Map<string, string>();
  for (const c of seedCategories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder },
      create: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        icon: c.icon,
        sortOrder: c.sortOrder,
        metaTitle: `${c.name} — купить в интернет-магазине ХАЯТ`,
        metaDescription: c.description,
      },
    });
    catIdBySlug.set(c.slug, cat.id);
  }
  const fallbackCat = catIdBySlug.get("vitaminy-mineraly")!;
  console.log(`📁 Категорий: ${seedCategories.length}`);

  // 4. Товары
  let order = 0;
  for (const p of seedProducts) {
    const categoryId = (p.cat && catIdBySlug.get(p.cat)) || fallbackCat;
    const priceKopecks = p.price * 100;
    const oldPriceKopecks = p.oldPrice ? p.oldPrice * 100 : null;
    const badges: string[] = [];
    if (oldPriceKopecks) badges.push("акция");

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        priceKopecks,
        oldPriceKopecks,
        categoryId,
        badges,
        volume: p.volume ?? null,
      },
      create: {
        slug: p.slug,
        name: p.name,
        shortDescription: shortDescriptionFor(p.name),
        description: `${shortDescriptionFor(p.name)}\n\nПроизводитель: ООО «Восток» (Россия). Продукция изготовлена из натурального сырья по традиционным рецептам.`,
        composition: "Натуральные компоненты. Подробный состав уточняйте на упаковке.",
        usage: "Применять согласно инструкции на упаковке или по рекомендации специалиста.",
        contraindications:
          "Индивидуальная непереносимость компонентов, беременность, период лактации. Перед применением проконсультируйтесь со специалистом.",
        volume: p.volume ?? null,
        priceKopecks,
        oldPriceKopecks,
        categoryId,
        badges,
        inStock: true,
        isActive: true,
        isFeatured: order % 9 === 0,
        sortOrder: order++,
        metaTitle: `${p.name} — купить, цена ${p.price} ₽`,
        metaDescription: shortDescriptionFor(p.name),
      },
    });
  }
  console.log(`🛒 Товаров: ${seedProducts.length}`);

  // 5. Баннеры (рекламные блоки)
  const banners = [
    {
      title: "Натуральные витамины для всей семьи",
      subtitle: "Фитопродукция ХАЯТ — проверено временем",
      ctaLabel: "В каталог",
      link: "/catalog",
      placement: "HERO" as const,
      bgColor: "#3a9447",
      sortOrder: 1,
    },
    {
      title: "−25% на первый заказ",
      subtitle: "Промокод FREE25Hayat при оформлении",
      ctaLabel: "Получить скидку",
      link: "/sale",
      placement: "HERO" as const,
      bgColor: "#d98a12",
      sortOrder: 2,
    },
    {
      title: "Бесплатная доставка от 20 000 ₽",
      subtitle: "По всей России",
      placement: "HOME_STRIP" as const,
      bgColor: "#2c7838",
      sortOrder: 1,
    },
  ];
  for (const b of banners) {
    const exists = await prisma.banner.findFirst({ where: { title: b.title } });
    if (!exists) await prisma.banner.create({ data: b });
  }
  console.log(`🖼  Баннеров: ${banners.length}`);

  // 6. Промокод
  await prisma.promoCode.upsert({
    where: { code: "FREE25HAYAT" },
    update: {},
    create: {
      code: "FREE25HAYAT",
      description: "Скидка 25% на первую покупку",
      discountType: "PERCENT",
      value: 25,
      isActive: true,
    },
  });

  // 7. Материалы (статьи)
  const materials = [
    {
      slug: "kak-vybrat-vitamin-d3",
      title: "Как выбрать витамин D3: дозировка и польза",
      excerpt: "Разбираем, кому и сколько витамина D3 нужно, и как выбрать форму выпуска.",
      content:
        "<p>Витамин D3 участвует в усвоении кальция, поддержке иммунитета и работе мышц. В этой статье — о дозировках 600–10000 МЕ и о том, как выбрать подходящий формат.</p>",
    },
    {
      slug: "polza-masla-chernogo-tmina",
      title: "Польза масла чёрного тмина",
      excerpt: "26 жирных кислот, витамины и минералы — чем полезно масло чёрного тмина.",
      content:
        "<p>Масло чёрного тмина содержит Omega-3, 6 и 9, фитостеролы и аминокислоты. Рассказываем о традиционном применении и способах приёма.</p>",
    },
  ];
  for (const m of materials) {
    await prisma.material.upsert({
      where: { slug: m.slug },
      update: {},
      create: {
        ...m,
        isPublished: true,
        publishedAt: new Date(),
        metaTitle: m.title,
        metaDescription: m.excerpt,
      },
    });
  }
  console.log(`📝 Материалов: ${materials.length}`);

  console.log("✅ Готово.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
