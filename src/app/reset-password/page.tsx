import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getDictionary } from "@/lib/i18n/server";

export default async function ResetPasswordPage() {
  const { locale, t } = await getDictionary();
  return <ResetPasswordForm locale={locale} t={t} />;
}
