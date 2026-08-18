import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChecklistTemplateItem } from "@/lib/database.types";

export const ROUND_CHECK_CATEGORIES = ["verschluss", "sauberkeit", "geraete", "beleuchtung"] as const;

export const ROUND_CHECK_LABEL: Record<string, string> = {
  verschluss: "Verschluss (Türen/Schubladen/Kühlschränke)",
  sauberkeit: "Sauberkeit (Theke/Arbeitsflächen)",
  geraete: "Geräte (Zapfanlage/Kaffeemaschine)",
  beleuchtung: "Beleuchtung",
};

export function defaultTemplateItems(type: "opening" | "closing"): ChecklistTemplateItem[] {
  if (type === "opening") {
    return [
      { text: "Kasse eingerichtet und Wechselgeld geprüft", requires_photo: false, category: "allgemein" },
      { text: "Zapfanlage gespült und geprüft", requires_photo: true, category: "allgemein" },
      { text: "Kühlschränke auf Temperatur geprüft", requires_photo: false, category: "allgemein" },
      { text: "Theke und Arbeitsflächen gereinigt", requires_photo: true, category: "allgemein" },
      { text: "Gläser poliert und aufgefüllt", requires_photo: false, category: "allgemein" },
      { text: "Garnituren vorbereitet", requires_photo: false, category: "allgemein" },
      { text: "Musik/Beleuchtung eingeschaltet", requires_photo: false, category: "allgemein" },
    ];
  }

  return [
    { text: "Kassenabschluss durchgeführt", requires_photo: false, category: "allgemein" },
    { text: "Endbestand erfasst (siehe Inventar)", requires_photo: false, category: "allgemein" },
    { text: "Spülmaschine gestartet", requires_photo: true, category: "allgemein" },
    { text: "Müll entsorgt", requires_photo: false, category: "allgemein" },
    { text: "Verderbliche Ware abgedeckt/gekühlt", requires_photo: true, category: "allgemein" },
    { text: "Haupteingang verschlossen", requires_photo: true, category: "verschluss" },
    { text: "Kühlschränke verschlossen", requires_photo: true, category: "verschluss" },
    { text: "Kassenschublade verschlossen", requires_photo: false, category: "verschluss" },
    { text: "Lagerraum verschlossen", requires_photo: true, category: "verschluss" },
    { text: "Theke abgewischt", requires_photo: true, category: "sauberkeit" },
    { text: "Arbeitsflächen gereinigt", requires_photo: false, category: "sauberkeit" },
    { text: "Boden gefegt/gewischt", requires_photo: false, category: "sauberkeit" },
    { text: "Zapfanlage ausgeschaltet/gespült", requires_photo: false, category: "geraete" },
    { text: "Kaffeemaschine ausgeschaltet", requires_photo: false, category: "geraete" },
    { text: "Spülmaschine geleert", requires_photo: false, category: "geraete" },
    { text: "Gastraum-Beleuchtung ausgeschaltet", requires_photo: false, category: "beleuchtung" },
    { text: "Notbeleuchtung funktionsfähig", requires_photo: false, category: "beleuchtung" },
  ];
}

/** Loads (or creates) today's draft submission for this user + template. */
export async function getOrCreateSubmission(
  supabase: SupabaseClient<Database>,
  templateId: string,
  userId: string,
) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabase
    .from("checklist_submissions")
    .select("*")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("checklist_submissions")
    .insert({ template_id: templateId, user_id: userId, date: today })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return created;
}

export async function signedPhotoUrl(supabase: SupabaseClient<Database>, path: string) {
  const { data } = await supabase.storage.from("checklist-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
