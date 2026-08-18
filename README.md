# Der Dicke Franz System

Internes Bar-Management fuer eine Hotel-Bar: Inventar, Lieferanten, Rezepte/Kosten,
Aufgaben, Opening/Closing-Checklisten (inkl. Round Check mit Live-Foto-Pflicht),
Mitarbeiterschulung und Berichte. Kein Kassensystem (POS) — das existiert separat.

Tech-Stack: Next.js (App Router) + TypeScript, Supabase (Auth, Postgres, Storage),
Tailwind CSS v4, Deployment auf Vercel.

## Setup

1. **Supabase-Projekt anlegen** (oder ein bestehendes verwenden).
2. **Migrationen ausfuehren**, in dieser Reihenfolge, per Supabase SQL-Editor oder
   `supabase db push`:
   - `supabase/migrations/0001_init.sql` — Tabellen, Enums, Trigger, Funktionen
   - `supabase/migrations/0002_rls.sql` — Row Level Security je Rolle
   - `supabase/migrations/0003_storage.sql` — Storage-Buckets fuer Fotos/Videos
   - `supabase/migrations/0004_function_privileges.sql` — schraenkt SECURITY
     DEFINER-Functions auf die vorgesehenen Aufrufer ein
3. **Env-Variablen setzen**: `cp .env.example .env.local` und mit den Werten aus
   Supabase → Project Settings → API befuellen.
4. **Ersten Outlet + Owner-Account anlegen**:
   - `insert into outlets (name) values ('Hotel Bar');`
   - Einen Nutzer per Supabase Auth registrieren (Login-Seite oder Dashboard).
     Der `on_auth_user_created`-Trigger legt automatisch ein `staff`-Profil an.
   - Diesen Account manuell zum Owner befoerdern und dem Outlet zuordnen:
     `update users set role = 'owner', outlet_id = '<outlet-id>' where email = '...';`
5. `npm install && npm run dev`

## Rollen

Owner, Manager und Mitarbeiter sehen je nach Rolle unterschiedliche Bereiche in der
Navigation. Die vollstaendige Rechte-Matrix ist in den RLS-Policies
(`supabase/migrations/0002_rls.sql`) sowie in `src/lib/auth.ts` und `src/lib/nav.ts`
abgebildet.

## Fotos in Checklisten

Fotopflichtige Punkte in Opening/Closing/Round-Check erfordern eine Live-Aufnahme
ueber die Gerätekamera (kein Galerie-Upload). Der Zeitstempel wird beim Aufnehmen
automatisch ins Bild eingebrannt; die Datei landet im privaten Storage-Bucket
`checklist-photos`, referenziert ueber `checklist_item_results.photo_url`.

## Projektstand

Phase 1, 2 und 3 sind umgesetzt:

- **Phase 1**: Auth & Rollen, Inventar, Opening/Closing inkl. Round Check &
  Fotopflicht, Aufgaben, Dashboard
- **Phase 2**: Lieferanten (Preisverlauf), Menue & Rezepte (Kosten-/Margen-
  berechnung), Berichte (Bestand, Ablauf-Tracker, Kosten/Marge, Aufgaben-
  erledigung pro Mitarbeiter, Closing-Verlauf inkl. Fotos, CSV-Export)
- **Phase 3**: Training & Quiz (Video-Upload, Scoring serverseitig ueber
  `submit_quiz_attempt`/`get_quiz_questions`, Fortschritt pro Mitarbeiter),
  In-App-Benachrichtigungen (Glocke: kritischer Bestand, nahender Ablauf,
  faellige Aufgaben, nicht ausgefuellte Checklisten), Audit-Log (protokolliert
  Bestandskorrekturen, Checklisten-Freigaben, Benutzeraenderungen),
  editierbare Checklisten-Vorlagen unter „Einstellungen"

Echte Push-Benachrichtigungen (Browser-Push) sind bewusst nicht enthalten —
dafuer braeuchte es zusaetzlich einen Service Worker, VAPID-Schluessel und
einen geplanten Supabase-Edge-Function-Job; die In-App-Glocke deckt denselben
Bedarf ohne diese zusaetzliche Infrastruktur ab.

## Deployment

Auf Vercel deployen und dort dieselben `NEXT_PUBLIC_SUPABASE_*`-Variablen setzen.
