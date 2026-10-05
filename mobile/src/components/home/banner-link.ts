import { useCallback } from "react";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { API_ORIGIN } from "@/api/config";

/**
 * `Banner.link` и любые ссылки из админки записаны в терминах ВЕБ-роутов сайта
 * (`/sale`, `/category/immunitet`). Экранов приложения с такими путями нет —
 * маппинг делаем здесь, в одном месте (контракт API, §7.5).
 *
 * Пути, у которых нативного экрана нет (оферта, политика, «о компании»),
 * открываем в SFSafariViewController: по HIG ссылка внутри приложения не должна
 * выкидывать пользователя в Safari.
 */
export function openExternal(url: string): void {
  void WebBrowser.openBrowserAsync(url, { dismissButtonStyle: "close" });
}

/** Значение параметра из сырой query-строки — без URLSearchParams-полифила RN. */
function queryParam(rawQuery: string, name: string): string | null {
  const match = new RegExp(`(?:^|&)${name}=([^&]*)`).exec(rawQuery);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1].replace(/\+/g, " "));
  } catch {
    return match[1];
  }
}

/** Каталог принимает только известные параметры; значения проверяет экран/API. */
function catalogParams(rawQuery: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const name of ["category", "audience", "goal", "onSale", "featured", "q", "sort", "inStock", "priceFrom", "priceTo"]) {
    const value = queryParam(rawQuery, name);
    if (value) params[name] = value;
  }
  return params;
}

export type BannerNavigate = (link: string | null | undefined) => void;

export function useBannerNavigate(): BannerNavigate {
  const router = useRouter();

  return useCallback(
    (link) => {
      if (!link) return;

      if (/^https?:\/\//i.test(link)) {
        openExternal(link);
        return;
      }

      const [beforeHash] = link.split("#");
      const [rawPath, rawQuery = ""] = beforeHash.split("?");
      const path = rawPath.replace(/\/+$/, "") || "/";
      const [head, tail] = path.split("/").filter(Boolean);
      const params = catalogParams(rawQuery);

      // уже на главной — вести никуда не нужно
      if (path === "/") return;

      switch (head) {
        case "catalog":
          router.push(Object.keys(params).length ? { pathname: "/catalog", params } : "/catalog");
          return;
        case "sale":
          router.push({ pathname: "/catalog", params: { ...params, onSale: "true" } });
          return;
        case "category":
          router.push({ pathname: "/catalog", params: { ...params, ...(tail ? { category: tail } : {}) } });
          return;
        case "for":
          router.push({ pathname: "/catalog", params: { ...params, ...(tail ? { audience: tail } : {}) } });
          return;
        case "goal":
          router.push({ pathname: "/catalog", params: { ...params, ...(tail ? { goal: tail } : {}) } });
          return;
        case "product":
          // относительный путь: карточка товара лежит внутри текущей вкладки
          if (tail)
            router.push(`./product/${tail}` as `./${string}`, { relativeToDirectory: true });
          return;
        case "search": {
          const q = queryParam(rawQuery, "q");
          router.push(q ? { pathname: "/search", params: { q } } : "/search");
          return;
        }
        case "articles":
          if (tail)
            router.push(`./article/${tail}` as `./${string}`, { relativeToDirectory: true });
          else router.push("./articles" as `./${string}`, { relativeToDirectory: true });
          return;
        default:
          openExternal(`${API_ORIGIN}${path}${rawQuery ? `?${rawQuery}` : ""}`);
      }
    },
    [router],
  );
}
