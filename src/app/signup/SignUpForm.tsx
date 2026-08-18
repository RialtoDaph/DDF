"use client";

import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { type ActionState, initialActionState } from "@/lib/actionState";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUp, initialActionState);

  if (state?.success) {
    return (
      <p className="text-sm text-done border border-done/40 bg-done-soft rounded-md px-3 py-2">
        Konto erstellt. Bitte pruefe dein E-Mail-Postfach, um die Adresse zu bestaetigen, und melde dich
        anschliessend an.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" type="text" required autoComplete="name" placeholder="Max Mustermann" />
      </div>
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" placeholder="name@hotelbar.de" />
      </div>
      <div>
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-warn border border-warn/40 bg-warn-soft rounded-md px-3 py-2">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Wird erstellt…" : "Konto erstellen"}
      </Button>
    </form>
  );
}
