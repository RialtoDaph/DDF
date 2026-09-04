import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

// Renders a client component that talks to Supabase directly — never
// prerender/cache it statically.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo priority className="w-40 h-auto mb-5" />
          <h1 className="sr-only">Passwort vergessen</h1>
          <p className="text-sm text-parchment-dim">Wir schicken dir einen Link zum Zuruecksetzen.</p>
        </div>
        <div className="paper-card p-6">
          <ForgotPasswordForm />
        </div>
        <p className="text-center text-sm text-parchment-dim mt-4">
          <Link href="/login" className="text-wine hover:underline">
            Zurueck zur Anmeldung
          </Link>
        </p>
      </div>
    </div>
  );
}
