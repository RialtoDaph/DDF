import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-brass mb-2">The Logbook</p>
          <h1 className="font-serif text-3xl text-parchment">Bar-Management</h1>
          <p className="text-sm text-parchment-dim mt-2">Internes System · Nur fuer Mitarbeitende</p>
        </div>
        <div className="paper-card p-6">
          <LoginForm next={next ?? "/dashboard"} />
        </div>
      </div>
    </div>
  );
}
