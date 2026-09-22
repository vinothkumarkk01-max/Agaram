import { SignupWizard } from "@/components/SignupWizard";
import { getDictionary } from "@/lib/i18n/server";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const { locale, t } = await getDictionary();
  const { next } = await searchParams;
  return (
    <SignupWizard
      locale={locale}
      t={t}
      next={typeof next === "string" ? next : undefined}
    />
  );
}
