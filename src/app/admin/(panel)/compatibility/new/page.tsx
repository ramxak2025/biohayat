import { AdminHeader } from "@/components/admin/ui";
import { RuleForm } from "../rule-form";

export const dynamic = "force-dynamic";

export default function NewRulePage() {
  return (
    <>
      <AdminHeader title="Новое правило совместимости" description="Опишите сочетание двух компонентов." />
      <RuleForm />
    </>
  );
}
