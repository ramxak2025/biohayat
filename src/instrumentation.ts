// Запускается один раз при старте сервера Next.js (см. docs: app/api-reference/file-conventions/instrumentation).
// Планировщик push-напоминаний о приёме БАД: каждую минуту смотрит активные курсы
// и шлёт уведомление, если наступило время слота и приём ещё не отмечен.

const MSK = "Europe/Moscow";

/** Текущие день (YYYY-MM-DD) и время (HH:MM) в московской зоне. */
function mskNow(): { day: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MSK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // hour может прийти как "24" при hour12:false — нормализуем в "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${hour}:${get("minute")}`,
  };
}

/** Дата (YYYY-MM-DD) в московской зоне для произвольного момента. */
function mskDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MSK, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Проверка критичного секрета сессий при старте. НЕ бросаем (чтобы не ронять
  // контейнер целиком), но громко предупреждаем — без секрета авторизация
  // админки/ЛК работать не будет либо станет небезопасной.
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || authSecret.length < 16) {
    console.error(
      "[security] AUTH_SECRET не задан или короче 16 символов! " +
        "Сессии админки и ЛК небезопасны. Задайте надёжный AUTH_SECRET в окружении.",
    );
  }

  // Динамический импорт: prisma и web-push должны грузиться только в nodejs-рантайме.
  const { prisma } = await import("@/lib/prisma");
  const { ensureVapidKeys, sendPushToCustomer } = await import("@/lib/push");

  try {
    await ensureVapidKeys();
  } catch (err) {
    console.error("[push] ensureVapidKeys on boot failed:", err);
  }

  // Дедупликация в памяти: "sent:{planId}:{day}:{slot}". Чистится при смене дня.
  const sent = new Set<string>();
  let sentDay = "";
  let busy = false;

  setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const { day, hhmm } = mskNow();
      if (day !== sentDay) {
        sent.clear();
        sentDay = day;
      }

      const plans = await prisma.intakePlan.findMany({
        where: { isActive: true, times: { has: hhmm } },
        select: { id: true, title: true, customerId: true, startDate: true, durationDays: true },
      });
      if (plans.length === 0) return;

      // Курс активен сегодня: startDate <= сегодня <= startDate + durationDays − 1 (или бессрочно).
      const due = plans.filter((p) => {
        const start = mskDay(p.startDate);
        if (day < start) return false;
        if (p.durationDays == null) return true;
        const end = mskDay(new Date(p.startDate.getTime() + (p.durationDays - 1) * 86_400_000));
        return day <= end;
      });
      if (due.length === 0) return;

      // Уже отмеченные приёмы за этот слот — не напоминаем.
      const logs = await prisma.intakeLog.findMany({
        where: { planId: { in: due.map((p) => p.id) }, day, slot: hhmm },
        select: { planId: true },
      });
      const logged = new Set(logs.map((l) => l.planId));

      for (const plan of due) {
        const key = `sent:${plan.id}:${day}:${hhmm}`;
        if (logged.has(plan.id) || sent.has(key)) continue;
        sent.add(key);
        try {
          await sendPushToCustomer(plan.customerId, {
            title: "Время приёма 💊",
            body: plan.title,
            url: "/account/intake",
          });
        } catch (err) {
          console.error("[push] reminder send failed:", err);
        }
      }
    } catch (err) {
      console.error("[push] reminder tick failed:", err);
    } finally {
      busy = false;
    }
  }, 60_000);
}
