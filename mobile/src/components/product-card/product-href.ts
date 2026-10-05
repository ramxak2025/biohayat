import type { Href } from "expo-router";

const productPaths = {
  "(home)": "/(tabs)/(home)/product/[slug]",
  catalog: "/(tabs)/catalog/product/[slug]",
  cart: "/(tabs)/cart/product/[slug]",
  account: "/(tabs)/account/product/[slug]",
} as const;

/** Product cards retain their tab on index, favorites and product detail screens. */
export function productHref(segments: readonly string[], slug: string): Href {
  const stack = segments[0] === "(tabs)" ? segments[1] : undefined;
  const pathname = stack && Object.hasOwn(productPaths, stack)
    ? productPaths[stack as keyof typeof productPaths]
    : "/catalog/product/[slug]";
  return { pathname, params: { slug } };
}
