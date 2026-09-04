"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSending(false);
    // Same message either way — this form must not reveal whether an
    // address is actually registered.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-done border border-done/40 bg-done-soft rounded-md px-3 py-2">
        Falls diese E-Mail-Adresse registriert ist, wurde ein Link zum Zuruecksetzen des Passworts
        verschickt. Bitte pruefe dein Postfach.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="name@hotelbar.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={sending || !email}>
        {sending ? "Wird gesendet…" : "Link zum Zuruecksetzen senden"}
      </Button>
    </form>
  );
}
