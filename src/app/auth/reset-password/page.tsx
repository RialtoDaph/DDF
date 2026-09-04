import { Logo } from "@/components/brand/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

// This page only ever makes sense per-request (it reads a one-time recovery
// link) — never prerender/cache it statically.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <Logo priority className="w-40 h-auto mb-5" />
          <h1 className="sr-only">Neues Passwort setzen</h1>
          <p className="text-sm text-parchment-dim">Neues Passwort setzen</p>
        </div>
        <div className="paper-card p-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
