"use client";

import { useFormStatus } from "react-dom";
import { togglePaymentPageActive } from "@/app/admin/toggle-payment-page-active";
import { Button } from "@/components/ui/button";

function Submit({
  isActive,
  labelDisable,
  labelEnable,
}: {
  isActive: boolean;
  labelDisable: string;
  labelEnable: string;
}) {
  const { pending } = useFormStatus();
  const label = isActive ? labelDisable : labelEnable;
  return (
    <Button
      type="submit"
      variant={isActive ? "outline" : "default"}
      size="sm"
      className="rounded-full"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? "…" : label}
    </Button>
  );
}

/** Client form so the Server Action reference stays stable (fixes UnrecognizedActionError with Turbopack + locale layout). */
export function TogglePageActiveForm({
  pageId,
  isActive,
  labelDisable,
  labelEnable,
}: {
  pageId: string;
  isActive: boolean;
  labelDisable: string;
  labelEnable: string;
}) {
  return (
    <form action={togglePaymentPageActive} className="inline">
      <input type="hidden" name="pageId" value={pageId} />
      <Submit isActive={isActive} labelDisable={labelDisable} labelEnable={labelEnable} />
    </form>
  );
}
