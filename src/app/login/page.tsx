import { AuthForm } from "@/components/AuthForm";
import { login } from "@/app/actions/auth";
import { getDictionary } from "@/lib/i18n/server";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { locale, t } = await getDictionary();
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      action={login}
      locale={locale}
      t={t}
      next={typeof next === "string" ? next : undefined}
      oauthError={error === "oauth"}
    />
  );
}
