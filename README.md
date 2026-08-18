# The Logbook — Bar-Management

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

Phase 1 (MVP) ist umgesetzt: Auth & Rollen, Inventar, Opening/Closing inkl. Round
Check, Aufgaben, Dashboard. Lieferanten, Menue/Rezepte, Berichte, Training und
Benachrichtigungen (Phase 2/3) folgen als naechste Ausbaustufen auf demselben
Datenmodell (siehe `supabase/migrations/0001_init.sql`).

## Deployment

Auf Vercel deployen und dort dieselben `NEXT_PUBLIC_SUPABASE_*`-Variablen setzen.
