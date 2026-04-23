import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageEditorForm } from "@/components/admin/PageEditorForm";

type Props = { params: Promise<{ locale: string }> };

export default async function NewPaymentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("newPage");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("description")}
        </p>
      </div>
      <PageEditorForm />
    </div>
  );
}
