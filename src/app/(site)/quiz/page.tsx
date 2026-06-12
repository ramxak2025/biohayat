import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { getSettings } from "@/lib/settings";
import { buildMetadata } from "@/lib/seo";
import { QuizFlow } from "./quiz-flow";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildMetadata(
    {
      title: "Подбор за 1 минуту",
      description:
        "Ответьте на 3 коротких вопроса — и мы покажем витамины и БАД ХАЯТ под вашу задачу.",
      path: "/quiz",
    },
    settings,
  );
}

export default function QuizPage() {
  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
          Подбор за 1 минуту
        </h1>
        <p className="mt-2 text-center text-sm text-ink-muted sm:text-base">
          Три коротких вопроса — и мы покажем продукты под вашу задачу
        </p>
        <QuizFlow />
      </div>
    </Container>
  );
}
