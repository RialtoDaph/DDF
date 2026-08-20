import Link from "next/link";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

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
    <div className="space-y-[var(--sp-lg)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">Training</h1>
          <p className="text-[length:var(--fs-body)] text-parchment-dim mt-1.5">Schulungsvideos &amp; Quiz je Rezept.</p>
        </div>
        {canManage && <LinkButton href="/training/new">+ Neues Modul</LinkButton>}
      </div>

      <Card>
        {(!modules || modules.length === 0) && (
          <p className="text-sm text-parchment-dim">Noch keine Trainingsmodule angelegt.</p>
        )}
        <ul className="divide-y divide-ink-border">
          {(modules ?? []).map((m) => {
            const p = progressByModule.get(m.id);
            const pct = p?.status === "passed" ? 100 : p?.status === "in_progress" ? (p.last_score ?? 0) : 0;
            const quizLabel =
              p?.status === "passed"
                ? p.last_score != null
                  ? `${p.last_score}%`
                  : "Bestanden"
                : p?.status === "in_progress"
                  ? "Nicht bestanden"
                  : "Noch nicht gestartet";

            return (
              <li key={m.id}>
                <Link href={`/training/${m.id}`} className="block py-2.5 px-1 -mx-1 rounded-md hover:bg-ink-raised transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <span className="text-[length:var(--fs-body)] text-parchment">{m.title}</span>
                      {m.menu_items && (
                        <span className="text-xs text-wine-soft ml-2">
                          {(m.menu_items as unknown as { name: string }).name}
                        </span>
                      )}
                    </div>
                    <span className="tabular text-xs text-parchment-dim whitespace-nowrap">{quizLabel}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink overflow-hidden border border-ink-border">
                    <div className="h-full rounded-full bg-wine" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
