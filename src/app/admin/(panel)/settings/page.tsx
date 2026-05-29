import { AdminHeader } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <AdminHeader title="Настройки" description="Контакты, реквизиты, интеграции, SEO" />
      <SettingsForm settings={settings} />
    </>
  );
}
