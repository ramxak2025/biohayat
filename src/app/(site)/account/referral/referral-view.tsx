"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Check, Copy, Gift, Loader2, Share2, Ticket, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatMoney } from "@/lib/utils";
import { applyReferralCode, type ReferralState } from "../actions";

const init: ReferralState = {};

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function SubmitApply() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Проверяем…</> : <><Check className="h-4 w-4" /> Активировать</>}
    </Button>
  );
}

function ApplyCodeForm() {
  const [state, action] = useActionState(applyReferralCode, init);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Код друга активирован. Бонус придёт после первого доставленного заказа.");
      formRef.current?.reset();
    }
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form ref={formRef} action={action} className="rounded-2xl bg-surface p-4 ring-1 ring-line sm:p-5">
      <div className="flex items-center gap-2.5">
        <Ticket className="h-5 w-5 shrink-0 text-brand-600" />
        <h2 className="font-bold">У меня есть код друга</h2>
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Введите код пригласившего — и после вашего первого доставленного заказа бонус получите вы оба.
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor="code" className="sr-only">Код друга</Label>
          <Input
            id="code"
            name="code"
            placeholder="HAYAT…"
            autoComplete="off"
            autoCapitalize="characters"
            className="uppercase"
          />
        </div>
        <SubmitApply />
      </div>
    </form>
  );
}

export function ReferralView({
  code,
  link,
  referralsCount,
  earnedKopecks,
  bonusKopecks,
  alreadyReferred,
}: {
  code: string;
  link: string;
  referralsCount: number;
  earnedKopecks: number;
  bonusKopecks: number;
  alreadyReferred: boolean;
}) {
  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} скопирован`);
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const share = async () => {
    const text = `Дарю вам ${formatMoney(bonusKopecks)} на покупки в ХАЯТ. Используйте мой код ${code}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "ХАЯТ — пригласи друга", text, url: link });
      } catch {
        // пользователь отменил — молча игнорируем
      }
    } else {
      await copy(link, "Ссылка");
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">Друзья</h1>

      {/* Крупная карточка приглашения */}
      <div className="animate-fade-up overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-sm sm:p-8">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
          <Gift className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-extrabold sm:text-2xl">
          Приведите друга — {formatMoney(bonusKopecks)} обоим
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/85">
          Друг вводит ваш код и оформляет первый заказ. После доставки {formatMoney(bonusKopecks)} получаете
          вы, и столько же — он.
        </p>

        <div className="mt-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-white/70">Ваш код</div>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/15 px-4 py-3 sm:flex-1">
              <span className="select-all font-mono text-xl font-extrabold tracking-widest">{code}</span>
              <button
                type="button"
                onClick={() => copy(code, "Код")}
                title="Скопировать код"
                className="-m-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:bg-white/15"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => copy(link, "Ссылка")}
                className="bg-white text-brand-700 hover:bg-white/90 active:bg-white/80 disabled:bg-white/70"
              >
                <Copy className="h-4 w-4" /> Скопировать ссылку
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={share}
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" /> Поделиться
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="animate-fade-up mt-5 grid gap-4 sm:grid-cols-2" style={{ animationDelay: "60ms" }}>
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Users className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-muted">Приглашено друзей</div>
            <div className="tnum text-2xl font-extrabold">
              {referralsCount}{" "}
              <span className="text-base font-bold text-ink-muted">
                {plural(referralsCount, "друг", "друга", "друзей")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
            <Wallet className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-muted">Заработано на друзьях</div>
            <div className="tnum text-2xl font-extrabold">{formatMoney(earnedKopecks)}</div>
          </div>
        </div>
      </div>

      {/* Ввод кода друга — только если ещё не привязан */}
      {!alreadyReferred ? (
        <div className="animate-fade-up mt-5" style={{ animationDelay: "120ms" }}>
          <ApplyCodeForm />
        </div>
      ) : (
        <div
          className="animate-fade-up mt-5 flex items-center gap-2.5 rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-700 ring-1 ring-brand-100"
          style={{ animationDelay: "120ms" }}
        >
          <Check className="h-5 w-5 shrink-0" />
          Вы уже активировали код друга.
        </div>
      )}
    </div>
  );
}
