import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Without this, requests go through the ambient fetch that Next.js
      // patches during a Server Component render to memoize identical GET
      // calls for the lifetime of that render. Two PostgREST reads with the
      // same query (e.g. a read-modify-reread pattern after losing an
      // insert race) then silently collapse into one — the second "read"
      // returns the first call's cached (stale) result instead of hitting
      // Postgres again, even though the data has since changed.
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render; the middleware refreshes
            // the session on the next request instead.
          }
        },
      },
    },
  );
}
