import { PageEditorForm } from "@/components/admin/PageEditorForm";

export default function NewPaymentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New payment page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure branding, amounts, GL codes, custom fields, and confirmation email. Saving opens
          the editor where you can copy links and QR codes.
        </p>
      </div>
      <PageEditorForm />
    </div>
  );
}
