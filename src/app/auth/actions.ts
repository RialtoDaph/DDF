"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/actionState";

/**
 * Only ever redirect to a same-app relative path. Rejects absolute URLs and
 * protocol-relative ("//host/...") values so a crafted `next` query param
 * can't be used to bounce a freshly-authenticated user off-site.
 */
function safeNext(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/dashboard";
  }
  return value;
}

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next") ? String(formData.get("next")) : null);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort pruefen." };
  }

  redirect(next);
}

/**
 * Supabase's leaked-password check against HaveIBeenPwned is a paid feature,
 * so this is the free stand-in: a length floor plus the handful of passwords
 * that actually get chosen when a team signs up in a hurry. Enforced here
 * rather than only on the input, since the form field is trivially bypassed.
 */
const MIN_PASSWORD_LENGTH = 8;

const WEAK_PASSWORDS = new Set([
  "passwort", "password", "12345678", "123456789", "1234567890",
  "qwertz123", "qwerty123", "passwort1", "password1", "bardickefranz",
  "dickefranz", "franz123", "willkommen", "hallo123", "admin123",
]);

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    return "Dieses Passwort ist zu leicht zu erraten. Bitte ein anderes waehlen.";
  }
  return null;
}

export async function signUp(_prevState: ActionState, formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { error: "Registrierung fehlgeschlagen. Bitte Angaben pruefen." };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
