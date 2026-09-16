import { AuthForm } from "@/components/AuthForm";
import { login } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";

export default async function LoginPage() {
  const { locale, t } = await getDictionary();
  return <AuthForm mode="login" action={login} locale={locale} t={t} />;
}
