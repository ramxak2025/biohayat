"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { addAddress, deleteAddress, setDefaultAddress, type AddressState } from "../actions";

export interface AddressData {
  id: string;
  label: string | null;
  city: string;
  street: string;
  isDefault: boolean;
}

const init: AddressState = {};

function SubmitAdd() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Сохранение…</> : "Сохранить адрес"}
    </Button>
  );
}

function AddAddressForm({ onSaved }: { onSaved: () => void }) {
  const [state, action] = useActionState(addAddress, init);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success("Адрес сохранён");
      formRef.current?.reset();
      onSaved();
    }
    if (state.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
      {state.error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{state.error}</div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="label">Название</Label>
          <Input id="label" name="label" placeholder="Дом, работа…" />
        </div>
        <div>
          <Label htmlFor="city" required>Город</Label>
          <Input id="city" name="city" placeholder="Грозный" autoComplete="address-level2" />
        </div>
      </div>
      <div>
        <Label htmlFor="street" required>Улица, дом, квартира</Label>
        <Input id="street" name="street" placeholder="ул. Ленина, д. 1, кв. 2" autoComplete="street-address" />
      </div>
      <SubmitAdd />
    </form>
  );
}

function AddressCard({ address }: { address: AddressData }) {
  const [pending, start] = useTransition();

  return (
    <div className={cn("rounded-2xl bg-surface p-5 ring-1", address.isDefault ? "ring-brand-300" : "ring-line")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
            <span className="font-bold">{address.label || "Адрес"}</span>
            {address.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                <Star className="h-3 w-3" /> Основной
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-sm text-ink-muted">{address.city}, {address.street}</p>
        </div>
        <button
          type="button"
          title="Удалить адрес"
          disabled={pending}
          onClick={() => {
            if (!confirm("Удалить этот адрес?")) return;
            start(async () => {
              const res = await deleteAddress(address.id);
              if (res.error) toast.error(res.error);
              else toast.success("Адрес удалён");
            });
          }}
          className="shrink-0 rounded-full p-2 text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-60"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </div>

      {!address.isDefault ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setDefaultAddress(address.id);
              if (res.error) toast.error(res.error);
              else toast.success("Адрес сделан основным");
            })
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          Сделать основным
        </Button>
      ) : null}
    </div>
  );
}

export function AddressesView({ addresses }: { addresses: AddressData[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "primary"}>
          {showForm ? <><X className="h-4 w-4" /> Закрыть</> : <><Plus className="h-4 w-4" /> Добавить адрес</>}
        </Button>
      </div>

      {showForm ? (
        <div className="mb-6">
          <AddAddressForm onSaved={() => setShowForm(false)} />
        </div>
      ) : null}

      {addresses.length === 0 && !showForm ? (
        <div className="rounded-2xl bg-surface-soft py-16 text-center">
          <MapPin className="mx-auto h-10 w-10 text-ink-faint" />
          <p className="mt-3 text-ink-muted">
            Сохранённых адресов пока нет. Они ускоряют оформление заказа.
          </p>
          <Button className="mt-5" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Добавить адрес
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <AddressCard key={a.id} address={a} />
          ))}
        </div>
      )}
    </div>
  );
}
