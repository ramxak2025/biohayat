import { readFile, stat } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

async function main() {
  const file = process.argv[2]; if (!file) throw new Error("Private operator credentials path required");
  if (((await stat(file)).mode & 0o077) !== 0) throw new Error("Operator credential file must have mode 0600");
  const credentials = z.object({ owner_email: z.literal("hello@web-kultura.ru"), owner_name: z.string().min(1), shop_admin_password: z.string().min(32) }).parse(JSON.parse(await readFile(file, "utf8")));
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email: credentials.owner_email } });
    if (existing) {
      if (existing.role !== "ADMIN" || !existing.isActive) throw new Error("Existing owner requires explicit operator reconciliation");
      console.log("Existing owner account preserved"); return;
    }
    await prisma.adminUser.create({ data: { email: credentials.owner_email, name: credentials.owner_name,
      passwordHash: await hash(credentials.shop_admin_password, 12), role: "ADMIN" } });
    console.log("Owner account provisioned; credentials remain in the private operator file");
  } finally { await prisma.$disconnect(); }
}
main().catch(() => { console.error("Owner provisioning failed. Inspect the private configuration; no credentials were logged."); process.exitCode = 1; });
