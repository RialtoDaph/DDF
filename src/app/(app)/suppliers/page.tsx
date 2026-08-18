import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

export default async function SuppliersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: suppliers } = await supabase.from("suppliers").select("id, name, contact, category").order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">Lieferanten</h1>
          <p className="text-sm text-parchment-dim mt-1">Kontakte und Preisverlauf.</p>
        </div>
        {canManageMasterData(profile.role) && <LinkButton href="/suppliers/new">Neuer Lieferant</LinkButton>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(suppliers ?? []).map((s) => (
          <Link key={s.id} href={`/suppliers/${s.id}`}>
            <Card className="hover:border-wine/50 transition-colors">
              <p className="text-parchment">{s.name}</p>
              <p className="text-xs text-parchment-dim mt-1">
                {s.category ?? "—"}
                {s.contact ? ` · ${s.contact}` : ""}
              </p>
            </Card>
          </Link>
        ))}
        {(!suppliers || suppliers.length === 0) && (
          <p className="text-sm text-parchment-dim col-span-full">Noch keine Lieferanten angelegt.</p>
        )}
      </div>
    </div>
  );
}
