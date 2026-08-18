import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { StampBadge } from "@/components/ui/StampBadge";

export default async function TrainingPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = canManageMasterData(profile.role);

  const [{ data: modules }, { data: progress }] = await Promise.all([
    supabase.from("training_modules").select("id, title, description, menu_items(name)").order("uploaded_at", { ascending: false }),
    supabase.from("staff_training_progress").select("training_module_id, status, last_score").eq("user_id", profile.id),
  ]);

  const progressByModule = new Map((progress ?? []).map((p) => [p.training_module_id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-parchment">Training</h1>
          <p className="text-sm text-parchment-dim mt-1">Schulungsvideos &amp; Quiz je Rezept.</p>
        </div>
        {canManage && <LinkButton href="/training/new">Neues Modul</LinkButton>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(modules ?? []).map((m) => {
          const p = progressByModule.get(m.id);
          return (
            <Link key={m.id} href={`/training/${m.id}`}>
              <Card className="hover:border-brass/50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-parchment">{m.title}</span>
                  {p?.status === "passed" && <StampBadge>Bestanden</StampBadge>}
                </div>
                {m.menu_items && (
                  <p className="text-xs text-brass-soft">{(m.menu_items as unknown as { name: string }).name}</p>
                )}
                {m.description && <p className="text-xs text-parchment-dim mt-1 line-clamp-2">{m.description}</p>}
                {p && p.status !== "passed" && (
                  <p className="text-xs text-parchment-dim mt-2">
                    {p.status === "in_progress" ? `Letzter Versuch: ${p.last_score ?? 0}%` : "Noch nicht begonnen"}
                  </p>
                )}
              </Card>
            </Link>
          );
        })}
        {(!modules || modules.length === 0) && (
          <p className="text-sm text-parchment-dim col-span-full">Noch keine Trainingsmodule angelegt.</p>
        )}
      </div>
    </div>
  );
}
