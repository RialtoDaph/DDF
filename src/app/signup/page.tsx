import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo priority className="w-32 h-auto mb-5" />
          <h1 className="font-serif text-2xl text-parchment">Konto erstellen</h1>
          <p className="text-sm text-parchment-dim mt-1">Internes System · Nur fuer Mitarbeitende</p>
        </div>
        <div className="paper-card p-6">
          <SignUpForm />
        </div>
        <p className="text-center text-sm text-parchment-dim mt-4">
          Bereits ein Konto?{" "}
          <Link href="/login" className="text-wine hover:underline">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
