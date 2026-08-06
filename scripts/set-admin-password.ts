/**
 * Смена пароля администратора.
 *
 * В панели нет ни экрана смены пароля, ни раздела пользователей, поэтому
 * пароль меняется только так. Скрипт правит существующую запись; создать
 * нового администратора он не может — это защита от опечатки в адресе,
 * которая молча завела бы второй аккаунт вместо смены пароля.
 *
 *   pnpm set:admin-password admin@biohayat.ru 'НовыйПароль123!'
 *
 * На сервере, внутри контейнера:
 *   docker compose exec -T app pnpm set:admin-password admin@biohayat.ru 'НовыйПароль123!'
 *
 * Пароль в одинарных кавычках: иначе оболочка съест ! и $.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [emailArg, password] = process.argv.slice(2);

  if (!emailArg || !password) {
    const users = await prisma.adminUser.findMany({
      select: { email: true, name: true, role: true, isActive: true },
      orderBy: { role: "asc" },
    });
    console.log("Использование: pnpm set:admin-password <e-mail> '<новый пароль>'\n");
    console.log("Учётные записи панели:");
    for (const u of users) {
      console.log(
        `  ${u.email.padEnd(26)} ${u.role.padEnd(7)} ${u.name}${u.isActive ? "" : "  (отключена)"}`,
      );
    }
    process.exitCode = 2;
    return;
  }

  const email = emailArg.toLowerCase().trim();

  // Требования те же, что и к паролю покупателя: длина — единственная защита,
  // которую нельзя обойти подбором по словарю.
  if (password.length < 10) {
    console.error("Пароль короче 10 символов — слишком просто подобрать.");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    console.error(`Учётной записи ${email} нет. Проверьте адрес: pnpm set:admin-password`);
    process.exitCode = 1;
    return;
  }

  await prisma.adminUser.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  console.log(`✅ Пароль для ${email} (${user.role}) изменён.`);
  console.log("   Старые сессии продолжают работать — выйдите из панели, чтобы проверить вход.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
