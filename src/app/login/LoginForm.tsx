"use client";

import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState = { error: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="username" placeholder="name@hotelbar.de" />
      </div>
      <div>
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && (
        <p className="text-sm text-warn border border-warn/40 bg-warn-soft rounded-md px-3 py-2">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Wird angemeldet…" : "Anmelden"}
      </Button>
    </form>
  );
}
