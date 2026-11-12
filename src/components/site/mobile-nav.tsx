"use client";

import { ListLink as Link } from "@/components/ui/list-link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Heart, LayoutGrid, ShoppingBag, User, Pill } from "lucide-react";
import { CATALOG_DIRECTIONS } from "../../../shared/catalog-directions";
import { useAuthFlag } from "@/lib/use-auth-flag";
import { useFavorites } from "@/components/favorites/favorites-provider";
import { useCart } from "@/components/cart/cart-provider";
import { Bump } from "@/components/motion/bump";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { count: favCount } = useFavorites();
  const { count: cartCount } = useCart();
  const loggedIn = useAuthFlag();
  // Залогиненный пользователь живёт в ОДНОМ постоянном баре везде —
  // без переключений между «магазинным» и «кабинетным» режимами.
  // «Магазин» открывает каталог (корзина — иконкой в шапке).
  const accountMode = loggedIn;

  // Оптимистичная подсветка нажатой вкладки до фактической смены маршрута
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    // Переход завершён — снимаем оптимистичное состояние
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    // Страховка: если переход прервался (свайп назад, ошибка сети) — сбросить
    if (!pendingHref) return;
    const t = setTimeout(() => setPendingHref(null), 8000);
    return () => clearTimeout(t);
  }, [pendingHref]);

  const current = pendingHref ?? pathname;
  const isActive = (href: string, exact?: boolean) =>
    exact ? current === href : current === href || current.startsWith(href + "/");

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[460px] items-stretch justify-around gap-1 rounded-[30px] bg-ink p-1.5 text-mist">
        {accountMode ? (
          <>
            {/* «Каталог» активен на любой витринной странице (вне ЛК и корзины) */}
            <Tab href="/catalog" label="Каталог" icon={LayoutGrid} active={!current.startsWith("/account") && !current.startsWith("/cart")} onPress={setPendingHref} />
            <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} onPress={setPendingHref} />
            <Tab
              href="/account/intake"
              label="Приём"
              icon={Pill}
              active={isActive("/account/intake")}
              onPress={setPendingHref}
            />
            <Tab href="/cart" label="Корзина" icon={ShoppingBag} active={isActive("/cart")} badge={cartCount} badgeTone="accent" onPress={setPendingHref} />
            <Tab href="/account" label="Кабинет" icon={User} active={current.startsWith("/account") && !isActive("/account/favorites") && !isActive("/account/intake")} onPress={setPendingHref} />
          </>
        ) : (
          <>
            <Tab href="/" label="Главная" icon={Home} active={isActive("/", true)} onPress={setPendingHref} />
            <Tab href="/account/favorites" label="Избранное" icon={Heart} active={isActive("/account/favorites")} badge={favCount} onPress={setPendingHref} />
            <Tab
              href="/catalog"
              label="Каталог"
              icon={LayoutGrid}
              active={isActive("/catalog") || CATALOG_DIRECTIONS.some(({ path }) => isActive(path))}
              onPress={setPendingHref}
            />
            <Tab href="/cart" label="Корзина" icon={ShoppingBag} active={isActive("/cart")} badge={cartCount} badgeTone="accent" onPress={setPendingHref} />
            <Tab href="/account" label="Кабинет" icon={User} active={isActive("/account", true)} onPress={setPendingHref} />
          </>
        )}
      </div>
    </nav>
  );
}

function Tab({
  href, label, icon: Icon, active, badge = 0, badgeTone = "sale", onPress,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
  badgeTone?: "sale" | "accent";
  onPress: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={() => onPress(href)}
      className={cn(
        // min-h 50px — комфортный тач-таргет; active:scale — мгновенный отклик на тап
        "flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[22px] py-1.5 transition-colors duration-[160ms]",
        active ? "bg-mist text-ink" : "text-mist",
      )}
    >
      {/* pill-подсветка активной вкладки */}
      <span
        className={cn(
          "flex h-[26px] w-[46px] items-center justify-center rounded-full transition-colors duration-150",
        )}
      >
        <TabIcon icon={Icon} active={active} badge={badge} badgeTone={badgeTone} />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

/** Иконка вкладки: бейдж количества + пульсация на время перехода. */
function TabIcon({
  icon: Icon, active, badge, badgeTone,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge: number;
  badgeTone: "sale" | "accent";
}) {
  const { pending } = useLinkStatus();
  return (
    <span className={cn("relative", pending && "animate-pulse")}>
      <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2 : 1.6} />
      {badge > 0 ? (
        <Bump
          value={badge}
          className={cn(
            "absolute -right-2 -top-1.5 h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white",
            badgeTone === "accent" ? "bg-grass !text-ink" : "bg-sale",
          )}
        >
          {badge}
        </Bump>
      ) : null}
    </span>
  );
}
