import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, canManageMasterData } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/Card";
import { StampBadge } from "@/components/ui/StampBadge";
import { QuizPlayer } from "./QuizPlayer";
import { QuizBuilder } from "./QuizBuilder";
import { AddVideoForm } from "./AddVideoForm";
import { EditModuleForm } from "./EditModuleForm";
import { recipeDisplayUnit } from "@/lib/recipeCost";

interface PlayerQuestion {
  id: string;
  question: string;
  type: "multiple_choice" | "short_answer";
  options: string[] | null;
}

export default async function TrainingModuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const canManage = canManageMasterData(profile.role);

  const [{ data: moduleData }, { data: questions }, { data: myProgress }] = await Promise.all([
    supabase.from("training_modules").select("*, menu_items(name)").eq("id", id).single(),
    supabase.rpc("get_quiz_questions", { p_module_id: id }),
    supabase
      .from("staff_training_progress")
      .select("status, last_score")
      .eq("training_module_id", id)
      .eq("user_id", profile.id)
      .maybeSingle(),
  ]);

  if (!moduleData) notFound();

  let ingredients: { recipeId: string; amount: number; name: string; unit: string }[] = [];
  if (moduleData.menu_item_id) {
    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, amount, inventory_items(name, unit, unit_volume_ml)")
      .eq("menu_item_id", moduleData.menu_item_id);
    ingredients = (recipes ?? []).map((r) => {
      const item = r.inventory_items as unknown as { name: string; unit: string; unit_volume_ml: number | null } | null;
      return { recipeId: r.id, amount: r.amount, name: item?.name ?? "—", unit: recipeDisplayUnit(item) };
    });
  }

  let videoUrl: string | null = null;
  if (moduleData.video_url) {
    const { data } = await supabase.storage.from("training-videos").createSignedUrl(moduleData.video_url, 3600);
    videoUrl = data?.signedUrl ?? null;
  }

  let fullQuestions: { id: string; question: string; type: "multiple_choice" | "short_answer"; options: string[] | null; correct_answer: string }[] = [];
  let allProgress: { status: string; last_score: number | null; users: { name: string } | null }[] = [];

  if (canManage) {
    const [{ data: fq }, { data: prog }] = await Promise.all([
      supabase.from("quiz_questions").select("id, question, type, options, correct_answer").eq("training_module_id", id),
      supabase.from("staff_training_progress").select("status, last_score, users(name)").eq("training_module_id", id),
    ]);
    fullQuestions = (fq ?? []) as typeof fullQuestions;
    allProgress = (prog ?? []) as unknown as typeof allProgress;
  }

  return (
    <div className="space-y-[var(--sp-lg)]">
      <Link href="/training" className="text-xs text-parchment-dim hover:text-parchment">
        ← Zurück zu Training
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif font-semibold text-[length:var(--fs-h1)] text-parchment">{moduleData.title}</h1>
          {moduleData.menu_items && (
            <p className="text-xs text-wine-soft mt-1.5">{(moduleData.menu_items as unknown as { name: string }).name}</p>
          )}
        </div>
        {myProgress?.status === "passed" && <StampBadge>Bestanden</StampBadge>}
      </div>

      {canManage && (
        <Card>
          <EditModuleForm module_={{ id, title: moduleData.title, description: moduleData.description }} />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          {videoUrl && (
            <Card>
              <video src={videoUrl} controls className="mx-auto block max-h-[60vh] w-auto max-w-full rounded-md" />
            </Card>
          )}

          {!videoUrl && canManage && (
            <Card>
              <CardHeader title="Video hinzufügen" />
              <AddVideoForm moduleId={id} />
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {(moduleData.description || moduleData.menu_item_id) && (
            <Card>
              {moduleData.description && (
                <div>
                  <CardHeader title="Geschichte" />
                  <p className="text-sm text-parchment-dim leading-relaxed whitespace-pre-line">{moduleData.description}</p>
                </div>
              )}
              {moduleData.menu_item_id && (
                <div className={moduleData.description ? "mt-4" : undefined}>
                  <CardHeader title="Rezept" />
                  {ingredients.length > 0 ? (
                    <ul className="divide-y divide-ink-border">
                      {ingredients.map((i) => (
                        <li key={i.recipeId} className="flex items-center justify-between py-1.5 text-sm">
                          <span className="text-parchment">{i.name}</span>
                          <span className="text-parchment-dim tabular">
                            {i.amount} {i.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-parchment-dim">Noch keine Zutaten hinterlegt.</p>
                  )}
                  {canManage && (
                    <Link href={`/menu/${moduleData.menu_item_id}`} className="text-xs text-wine-soft hover:underline mt-3 inline-block">
                      {ingredients.length > 0 ? "Vollständiges Rezept & Kalkulation ansehen →" : "Zutaten in Menue & Rezepte hinzufügen →"}
                    </Link>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader title="Quiz" subtitle="Ab 80% bestanden" />
        {questions && questions.length > 0 ? (
          <QuizPlayer moduleId={id} questions={questions as unknown as PlayerQuestion[]} />
        ) : (
          <p className="text-sm text-parchment-dim">Noch kein Quiz hinterlegt.</p>
        )}
      </Card>

      {canManage && (
        <Card>
          <CardHeader title="Quiz verwalten" />
          <QuizBuilder moduleId={id} questions={fullQuestions} />
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader title="Fortschritt aller Mitarbeitenden" />
          {allProgress.length === 0 ? (
            <p className="text-sm text-parchment-dim">Noch keine Versuche.</p>
          ) : (
            <ul className="divide-y divide-ink-border">
              {allProgress.map((p, i) => (
                <li key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-parchment">{p.users?.name ?? "—"}</span>
                  {p.status === "passed" ? (
                    <StampBadge>Bestanden ({p.last_score}%)</StampBadge>
                  ) : (
                    <StampBadge variant="warn">{p.status === "in_progress" ? `${p.last_score ?? 0}%` : "Nicht begonnen"}</StampBadge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
