"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Star, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Checkbox } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  createAddress,
  updateAddress,
  deleteAddress,
  setDefault,
  type AddressState,
} from "./actions";

export interface AddressData {
  id: string;
  label: string | null;
  recipient: string | null;
  phone: string | null;
  city: string;
  street: string;
  house: string | null;
  apartment: string | null;
  comment: string | null;
  isDefault: boolean;
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Сохранение…" : editing ? "Сохранить адрес" : "Добавить адрес"}
    </Button>
  );
}

/** Форма создания/редактирования адреса. */
function AddressForm({
  address,
  onDone,
  onCancel,
}: {
  address?: AddressData;
  onDone: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(address);
  const [state, action] = useActionState<AddressState, FormData>(
    editing ? updateAddress : createAddress,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(editing ? "Адрес обновлён" : "Адрес добавлен");
      onDone();
    }
    if (state.error) toast.error(state.error);
  }, [state, editing, onDone]);

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="label">Название</Label>
          <Input id="label" name="label" placeholder="Дом, Работа…" defaultValue={address?.label ?? ""} />
        </div>
        <div>
          <Label htmlFor="recipient">Получатель</Label>
          <Input id="recipient" name="recipient" placeholder="Имя получателя" defaultValue={address?.recipient ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="phone">Телефон</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+7…" defaultValue={address?.phone ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="city" required>Город</Label>
          <Input id="city" name="city" defaultValue={address?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="street" required>Улица</Label>
          <Input id="street" name="street" defaultValue={address?.street ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="house">Дом</Label>
          <Input id="house" name="house" defaultValue={address?.house ?? ""} />
        </div>
        <div>
          <Label htmlFor="apartment">Квартира / офис</Label>
          <Input id="apartment" name="apartment" defaultValue={address?.apartment ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="comment">Комментарий</Label>
        <Textarea id="comment" name="comment" placeholder="Подъезд, этаж, домофон…" defaultValue={address?.comment ?? ""} />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink">
        <Checkbox name="isDefault" defaultChecked={address?.isDefault ?? false} />
        Сделать адресом по умолчанию
      </label>

      <div className="flex gap-2">
        <SubmitButton editing={editing} />
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4" /> Отмена
        </Button>
      </div>
    </form>
  );
}

/** Карточка одного адреса с действиями. */
function AddressCard({ address, onEdit }: { address: AddressData; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const lines = [
    [address.city, address.street].filter(Boolean).join(", "),
    [address.house ? `д. ${address.house}` : null, address.apartment ? `кв. ${address.apartment}` : null]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return (
    <div className={cn(
      "rounded-2xl bg-surface p-5 ring-1",
      address.isDefault ? "ring-brand-300" : "ring-line",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
            <span className="font-bold">{address.label || "Адрес"}</span>
            {address.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
                <Check className="h-3 w-3" /> По умолчанию
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 space-y-0.5 text-sm text-ink-muted">
            {lines.map((l, i) => <p key={i}>{l}</p>)}
            {address.recipient || address.phone ? (
              <p className="text-ink-faint">{[address.recipient, address.phone].filter(Boolean).join(", ")}</p>
            ) : null}
            {address.comment ? <p className="text-ink-faint">{address.comment}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!address.isDefault ? (
            <button
              type="button"
              title="Сделать по умолчанию"
              disabled={pending}
              onClick={() => start(async () => { await setDefault(address.id); })}
              className="rounded-full p-2 text-ink-muted hover:bg-surface-soft hover:text-brand-600 disabled:opacity-60"
            >
              <Star className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="button"
            title="Редактировать"
            onClick={onEdit}
            className="rounded-full p-2 text-ink-muted hover:bg-surface-soft hover:text-ink"
          >
            <Pencil className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            title="Удалить"
            disabled={pending}
            onClick={() => {
              if (confirm("Удалить этот адрес?")) start(async () => { await deleteAddress(address.id); });
            }}
            className="rounded-full p-2 text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-60"
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddressesView({ addresses }: { addresses: AddressData[] }) {
  // null — форма скрыта; "new" — добавление; иначе id редактируемого адреса.
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const editingAddress = typeof editing === "string" && editing !== "new"
    ? addresses.find((a) => a.id === editing)
    : undefined;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Адреса доставки</h1>
        {editing === null ? (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Добавить адрес
          </Button>
        ) : null}
      </div>

      {editing === "new" ? (
        <div className="mb-6">
          <AddressForm onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </div>
      ) : null}

      {addresses.length === 0 && editing !== "new" ? (
        <div className="rounded-2xl bg-surface-soft py-16 text-center">
          <MapPin className="mx-auto h-10 w-10 text-ink-faint" />
          <p className="mt-3 text-ink-muted">Сохранённых адресов пока нет.</p>
          <Button className="mt-5" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Добавить адрес
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((a) =>
            editing === a.id && editingAddress ? (
              <AddressForm
                key={a.id}
                address={editingAddress}
                onDone={() => setEditing(null)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <AddressCard key={a.id} address={a} onEdit={() => setEditing(a.id)} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
