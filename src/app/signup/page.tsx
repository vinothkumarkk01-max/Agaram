import { AuthForm } from "@/components/AuthForm";
import { signup } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { locale, t } = await getDictionary();
  const { next } = await searchParams;
  return (
    <AuthForm
      mode="signup"
      action={signup}
      locale={locale}
      t={t}
      next={typeof next === "string" ? next : undefined}
    />
  );
}
