import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/ui";
import { RuleForm } from "../rule-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rule = await prisma.compatibilityRule.findUnique({ where: { id } });
  if (!rule) notFound();

  return (
    <>
      <AdminHeader
        title="Редактирование правила"
        description={`${rule.componentA} + ${rule.componentB}`}
      />
      <RuleForm rule={rule} />
    </>
  );
}
