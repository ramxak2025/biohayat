import type { Metadata } from "next";
import { FavoritesView } from "./favorites-view";

export const metadata: Metadata = {
  title: "Избранное — ХАЯТ",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
