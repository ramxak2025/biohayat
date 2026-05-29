"use client";

import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children = "Сохранить" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function DeleteButton({
  action,
  label = "Удалить",
  confirmText = "Удалить безвозвратно?",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmText?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={async () => {
        if (!confirm(confirmText)) return;
        setPending(true);
        try {
          await action();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {label}
    </Button>
  );
}
