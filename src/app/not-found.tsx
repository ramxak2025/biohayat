import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="text-7xl font-extrabold text-brand-500">404</span>
      <h1 className="mt-4 text-2xl font-extrabold">Страница не найдена</h1>
      <p className="mt-2 max-w-md text-ink-muted">
        Возможно, страница была удалена или вы перешли по неверной ссылке.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild size="lg">
          <Link href="/">На главную</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/catalog">В каталог</Link>
        </Button>
      </div>
    </div>
  );
}
