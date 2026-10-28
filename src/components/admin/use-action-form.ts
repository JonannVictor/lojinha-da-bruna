"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { idleState, type ActionState } from "@/lib/admin/action-state";

/**
 * useActionState for forms whose typed values must survive a validation
 * error. A plain <form action> is reset by React after every submission;
 * submitting through onSubmit keeps the fields as the user left them.
 */
export function useActionForm(
  action: (state: ActionState, formData: FormData) => Promise<ActionState>,
  prepare?: (formData: FormData) => void,
) {
  const [state, dispatch, pending] = useActionState(action, idleState);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    prepare?.(formData);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending, dispatch };
}
