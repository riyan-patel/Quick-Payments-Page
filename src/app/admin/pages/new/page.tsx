import { PageEditorForm } from "@/components/admin/PageEditorForm";

export default function NewPaymentPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">New payment page</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Configure branding, amounts, GL codes, custom fields, and confirmation email. After save
          you can copy links, iframe, and QR from Distribution.
        </p>
      </div>
      <PageEditorForm />
    </div>
  );
}
