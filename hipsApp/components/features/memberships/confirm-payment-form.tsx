"use client";

import { useActionState } from "react";

import {
  confirmPayment,
  type ConfirmPaymentState,
} from "@/app/actions/memberships";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/lib/payment";

const initialState: ConfirmPaymentState = { error: null };

export function ConfirmPaymentForm({
  actionLabel,
  amount,
  method,
  planId,
  reference,
  studentId,
}: {
  actionLabel: string;
  amount: number;
  method: PaymentMethod;
  planId: string;
  reference: string;
  studentId: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmPayment,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reference" value={reference} />
      {state.error ? (
        <p
          role="alert"
          className="mb-3 text-center text-sm font-medium text-destructive"
        >
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="min-h-14 w-full rounded-xl text-base font-semibold"
      >
        {pending ? "Confirmando…" : actionLabel}
      </Button>
    </form>
  );
}
