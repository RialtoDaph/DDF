"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, canManageTips } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { KITCHEN_SHARE_RATIO, roundCents } from "@/lib/tips";

export async function saveTipDay(_prevState: unknown, formData: FormData) {
  const profile = await requireProfile();
  if (!canManageTips(profile.role)) return { error: "Keine Berechtigung." };
  if (!profile.outlet_id) return { error: "Kein Standort zugeordnet." };

  const tipDate = String(formData.get("tip_date") ?? "");
  const totalAmount = Number(formData.get("total_amount") ?? 0);
  const workerIds = formData.getAll("worker_ids").map(String);

  if (!tipDate) return { error: "Bitte ein Datum angeben." };
  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    return { error: "Bitte einen gueltigen Betrag angeben." };
  }
  if (totalAmount > 0 && workerIds.length === 0) {
    return { error: "Bitte mindestens eine Person auswaehlen, die an diesem Tag gearbeitet hat." };
  }

  const kitchenShare = roundCents(totalAmount * KITCHEN_SHARE_RATIO);
  const staffShare = roundCents(totalAmount - kitchenShare);

  const supabase = await createClient();

  const { data: day, error } = await supabase
    .from("tip_days")
    .upsert(
      {
        outlet_id: profile.outlet_id,
        tip_date: tipDate,
        total_amount: totalAmount,
        kitchen_share: kitchenShare,
        staff_share: staffShare,
        created_by: profile.id,
      },
      { onConflict: "outlet_id,tip_date" },
    )
    .select("id")
    .single();

  if (error || !day) return { error: error?.message ?? "Konnte nicht gespeichert werden." };

  // Replace the worker list wholesale — simplest correct way to handle a
  // re-save of the same day with a different crew.
  const { error: deleteError } = await supabase.from("tip_day_workers").delete().eq("tip_day_id", day.id);
  if (deleteError) return { error: deleteError.message };

  if (workerIds.length > 0) {
    const { error: insertError } = await supabase
      .from("tip_day_workers")
      .insert(workerIds.map((userId) => ({ tip_day_id: day.id, user_id: userId })));
    if (insertError) return { error: insertError.message };
  }

  await logAudit(supabase, profile.id, "tip_day_save", "tip_days", {
    tip_day_id: day.id,
    tip_date: tipDate,
    total_amount: totalAmount,
    worker_count: workerIds.length,
  });

  revalidatePath("/tips");
  return { success: true };
}

export async function deleteTipDay(tipDayId: string) {
  const profile = await requireProfile();
  if (!canManageTips(profile.role)) return { error: "Keine Berechtigung." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tip_days").delete().eq("id", tipDayId).select("id").maybeSingle();
  if (error) return { error: error.message };
  // RLS can silently match zero rows (wrong outlet, role) instead of
  // failing loudly.
  if (!data) return { error: "Nicht gefunden oder keine Berechtigung." };

  await logAudit(supabase, profile.id, "tip_day_delete", "tip_days", { tip_day_id: tipDayId });

  revalidatePath("/tips");
  return { success: true };
}
