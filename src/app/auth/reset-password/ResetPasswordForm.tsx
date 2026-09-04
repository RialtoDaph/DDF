"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { passwordProblem } from "@/lib/password";

export function ResetPasswordForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link exchanges its code for a session on load; that shows
  // up either as a PASSWORD_RECOVERY auth event or, if it already fired
  // before this listener attached, as a session already present.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (password !== confirm) {
      setError("Passwoerter stimmen nicht ueberein.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (updateError) {
      setError("Passwort konnte nicht geaendert werden. Bitte fordere einen neuen Link an.");
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/dashboard"), 1500);
  }

  if (checking) {
    return <p className="text-sm text-parchment-dim">Laedt…</p>;
  }

  if (done) {
    return (
      <p className="text-sm text-done border border-done/40 bg-done-soft rounded-md px-3 py-2">
        Passwort geaendert. Du wirst weitergeleitet…
      </p>
    );
  }

  if (!ready) {
    return (
      <p className="text-sm text-warn border border-warn/40 bg-warn-soft rounded-md px-3 py-2">
        Dieser Link ist ungueltig oder abgelaufen. Bitte fordere einen neuen Link an.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-parchment-dim mt-1">Mindestens 8 Zeichen.</p>
      </div>
      <div>
        <Label htmlFor="confirm">Passwort bestaetigen</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-warn border border-warn/40 bg-warn-soft rounded-md px-3 py-2">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Wird gespeichert…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
