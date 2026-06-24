# Partner Stage Gate Tracker

Blue Yonder alliance Partner Stage Gate Tracker MVP.

## Sprint 1 scope

- Supabase authentication
- Admin user and role management
- Partner list
- Partner detail
- Partner create/edit

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key is used only in server-side admin user creation flows.

## Partner defaults

New partners start at the `SG0` Identification stage with the `registered` tier. `Nexus` is the next tier after the partner advances beyond initial registration.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```
