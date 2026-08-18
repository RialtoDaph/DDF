import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-brass mb-2">Der Dicke Franz</p>
          <h1 className="font-serif text-3xl text-parchment">Konto erstellen</h1>
          <p className="text-sm text-parchment-dim mt-2">Internes System · Nur fuer Mitarbeitende</p>
        </div>
        <div className="paper-card p-6">
          <SignUpForm />
        </div>
        <p className="text-center text-sm text-parchment-dim mt-4">
          Bereits ein Konto?{" "}
          <Link href="/login" className="text-brass hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
