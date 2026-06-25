# AGENTS.md

## Cursor Cloud specific instructions

This is a single Next.js 16 / React 19 app ("CastleGate") backed by a hosted Supabase project (PostgreSQL + Auth). There is no separate backend service and no local Supabase/Docker stack — all data access goes through the hosted Supabase instance. See `README.md` for the canonical command list and full MVP test flow.

### Environment variables
- The app and scripts read three required Supabase values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. In Cursor Cloud these are injected as environment secrets.
- `lib/supabase/server.ts` throws at runtime if the URL/anon key are missing, so the app will not boot without them.
- A gitignored `.env.local` is the convenient way to make these (plus `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `ALLOW_REMOTE_DEMO_SEED`) available to both `next dev` and the plain Node scripts. Recreate it from the injected secrets if it is missing (it is not committed).

### Running services
- Dev server: `npm run dev` → http://localhost:3000. The root route redirects unauthenticated users to `/login` (Supabase email/password auth via middleware in `proxy.ts`).
- The hosted Supabase project already has all migrations in `supabase/migrations/` and reference data applied (roles, stage gates SG0–SG2, requirements, approval rules) plus seed partners. You normally do NOT need to re-apply migrations.

### Demo data / login
- `npm run seed:demo` resets the demo dataset (demo admin user + "HERE Technologies" SG0 workflow). It is idempotent.
- Gotcha: the seed script refuses non-local Supabase URLs unless `ALLOW_REMOTE_DEMO_SEED=true`. Because the cloud environment points at a hosted `*.supabase.co` URL, you MUST set `ALLOW_REMOTE_DEMO_SEED=true` (already in `.env.local`) for the seed to run.
- Test login after seeding: `demo.admin@example.com` / `DemoAdmin123!` (overridable via `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD`).
- Note: after login the app lands on `/partners`; the dashboard is at `/dashboard` via the left nav.

### Validation before a PR
Run the suite documented in `README.md`: `npm run check:supabase-embeds`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Gotcha: `npm run build` rewrites `next-env.d.ts` (changes `./.next/types/...` to `./.next/dev/types/...`). Do not commit that churn — revert it with `git checkout -- next-env.d.ts`.
