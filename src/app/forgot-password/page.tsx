import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { getDictionary } from "@/lib/i18n/server";

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const { locale, t } = await getDictionary();
  const { error } = await searchParams;
  return (
    <ForgotPasswordForm locale={locale} t={t} expired={error === "expired"} />
  );
}
