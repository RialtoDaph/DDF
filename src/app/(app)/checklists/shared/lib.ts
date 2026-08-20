import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ChecklistTemplateItem, ChecklistType } from "@/lib/database.types";

export const CHECKLIST_TYPES = ["opening", "closing", "weekly", "monthly"] as const;

export const CHECKLIST_LABEL: Record<ChecklistType, string> = {
  opening: "Opening",
  closing: "Closing",
  weekly: "Wochencheck",
  monthly: "Monatscheck",
};

export function isChecklistType(value: string): value is ChecklistType {
  return (CHECKLIST_TYPES as readonly string[]).includes(value);
}

/**
 * The period a submission belongs to: the day itself for opening/closing, the
 * Monday for a weekly check, the 1st for a monthly one. A Wochencheck started
 * on Tuesday and finished on Thursday has to resolve to the same form, which
 * is why submissions are keyed by this rather than by the calendar date.
 */
export function periodStartFor(type: ChecklistType, now = new Date()): string {
  // Read the calendar date in the outlet's own timezone rather than the
  // server's — mixing server-local Y/M/D with a UTC-labeled date flips the
  // day (and the weekly Monday / monthly 1st boundary) around midnight
  // Europe/Berlin on a UTC-hosted server, worse near DST changes.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const d = new Date(Date.UTC(year, month - 1, day));

  if (type === "weekly") {
    const mondayOffset = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - mondayOffset);
  } else if (type === "monthly") {
    d.setUTCDate(1);
  }

  return d.toISOString().slice(0, 10);
}

/** Human label for the period a submission covers, e.g. "Woche ab 17.08.". */
export function periodLabel(type: ChecklistType, periodStart: string): string {
  const [y, m, d] = periodStart.split("-").map(Number);

  if (type === "monthly") {
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  const start = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.`;
  if (type === "weekly") {
    const end = new Date(Date.UTC(y, m - 1, d + 6));
    const endLabel = `${String(end.getUTCDate()).padStart(2, "0")}.${String(end.getUTCMonth() + 1).padStart(2, "0")}.`;
    return `Woche ${start}–${endLabel}`;
  }

  return `${start}${y}`;
}

export const ROUND_CHECK_CATEGORIES = ["verschluss", "sauberkeit", "geraete", "beleuchtung"] as const;

export const ROUND_CHECK_LABEL: Record<string, string> = {
  verschluss: "Verschluss (Türen/Schubladen/Kühlschränke)",
  sauberkeit: "Sauberkeit (Theke/Arbeitsflächen)",
  geraete: "Geräte (Zapfanlage/Kaffeemaschine)",
  beleuchtung: "Beleuchtung",
};

export function defaultTemplateItems(type: ChecklistType): ChecklistTemplateItem[] {
  if (type === "weekly") {
    return [
      { text: "Kühlschränke innen gereinigt", requires_photo: true, category: "allgemein" },
      { text: "Kaffeemaschine entkalkt/durchgespült", requires_photo: true, category: "allgemein" },
      { text: "Zapfanlage Grundreinigung", requires_photo: true, category: "allgemein" },
      { text: "Siebe und Ausgüsse gereinigt", requires_photo: false, category: "allgemein" },
      { text: "Lager aufgeräumt und Ware vorgezogen", requires_photo: false, category: "allgemein" },
      { text: "Bestand mit Sollbestand abgeglichen", requires_photo: false, category: "allgemein" },
      { text: "Gläserbruch erfasst", requires_photo: false, category: "allgemein" },
    ];
  }

  if (type === "monthly") {
    return [
      { text: "Vollständige Inventur durchgeführt", requires_photo: false, category: "allgemein" },
      { text: "Alle Ablaufdaten geprüft, abgelaufene Ware entsorgt", requires_photo: true, category: "allgemein" },
      { text: "Kühlschrank-Temperaturen dokumentiert", requires_photo: true, category: "allgemein" },
      { text: "Feuerlöscher und Notausgang geprüft", requires_photo: true, category: "allgemein" },
      { text: "Erste-Hilfe-Kasten aufgefüllt", requires_photo: false, category: "allgemein" },
      { text: "Geräte auf Schäden geprüft", requires_photo: false, category: "allgemein" },
      { text: "Lieferantenpreise überprüft", requires_photo: false, category: "allgemein" },
    ];
  }

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

/** Loads (or creates) the draft submission for this user + template + period. */
export async function getOrCreateSubmission(
  supabase: SupabaseClient<Database>,
  templateId: string,
  userId: string,
  periodStart: string,
) {
  // limit(1) rather than maybeSingle(): this runs during page render, so two
  // near-simultaneous requests (a second tab, a refresh mid-flight) can both
  // miss the read and insert. The unique index added in migration 0006 makes
  // the loser fail with 23505, which we resolve by re-reading below — but rows
  // created before that index existed must not 500 the page either.
  const readExisting = () =>
    supabase
      .from("checklist_submissions")
      .select("*")
      .eq("template_id", templateId)
      .eq("user_id", userId)
      .eq("period_start", periodStart)
      .order("created_at", { ascending: true })
      .limit(1);

  const { data: existing } = await readExisting();
  if (existing && existing.length > 0) return existing[0];

  const { data: created, error } = await supabase
    .from("checklist_submissions")
    .insert({ template_id: templateId, user_id: userId, period_start: periodStart })
    .select("*")
    .single();

  if (created) return created;

  // Lost the insert race — the row the other request created is the one to use.
  const { data: raced } = await readExisting();
  if (raced && raced.length > 0) return raced[0];

  throw new Error(error?.message ?? "Checklisten-Eintrag konnte nicht angelegt werden.");
}

export async function signedPhotoUrl(supabase: SupabaseClient<Database>, path: string) {
  const { data } = await supabase.storage.from("checklist-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
