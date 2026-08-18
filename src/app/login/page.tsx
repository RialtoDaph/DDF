import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deactivated?: string }>;
}) {
  const { next, deactivated } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-brass mb-2">The Logbook</p>
          <h1 className="font-serif text-3xl text-parchment">Bar-Management</h1>
          <p className="text-sm text-parchment-dim mt-2">Internes System · Nur fuer Mitarbeitende</p>
        </div>
        {deactivated && (
          <p className="text-sm text-warn border border-warn/40 bg-warn-soft rounded-md px-3 py-2 mb-4">
            Dieses Konto wurde deaktiviert. Bitte wende dich an einen Manager oder Owner.
          </p>
        )}
        <div className="paper-card p-6">
          <LoginForm next={safeNext} />
        </div>
        <p className="text-center text-sm text-parchment-dim mt-4">
          Noch kein Konto?{" "}
          <Link href="/signup" className="text-brass hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
