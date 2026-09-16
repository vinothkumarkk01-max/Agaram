import { AuthForm } from "@/components/AuthForm";
import { signup } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";

export default async function SignupPage() {
  const { locale, t } = await getDictionary();
  return <AuthForm mode="signup" action={signup} locale={locale} t={t} />;
}
