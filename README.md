# CastleGate

CastleGate Partner Governance Platform MVP.

The MVP manages partner stage-gate execution from SG0 through SG2:

- Partner records and ownership
- Stage checklists
- Stage gate packages
- Approval workflows
- Decision logs
- Executive dashboard
- Demo data reset for end-to-end testing

## MVP scope

### Included

- Partners
- Stage gate packages
- SG0, SG1, and SG2 checklist/package workflow
- Approvals
- My Approvals queue
- Decision logs
- Dashboard
- Demo seed/reset script

### Excluded

- Email
- Notifications
- Exports
- Analytics
- Bulk actions
- Advanced RBAC
- AI intake
- SG3+ implementation

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Configure Supabase.

Run the Supabase migrations in timestamp order against a local or development Supabase project. The migrations live in:

```text
supabase/migrations/
```

4. Start the app:

```bash
npm run dev
```

5. Open the app:

```text
http://localhost:3000
```

## Required environment variables

Copy `.env.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DEMO_ADMIN_EMAIL=demo.admin@example.com
DEMO_ADMIN_PASSWORD=DemoAdmin123!
ALLOW_REMOTE_DEMO_SEED=false
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- It is used for admin user creation and demo seed/reset.
- Do not expose the service role key to the browser.
- `ALLOW_REMOTE_DEMO_SEED=true` is only needed if you intentionally seed a non-local development Supabase project.

## Partner defaults

New partners start at the `SG0` Identification stage with the `registered` tier. Existing `Nexus` tier records map to `Advanced`; existing `Synergy` and `Apex` tier records map to `Authorized`.

## Demo seed instructions

The demo seed script resets a safe MVP demo dataset for local/development testing.

Run:

```bash
npm run seed:demo
```

The script creates or resets:

- Demo admin user
- System Admin role mapping
- HERE Technologies partner
- SG0 checklist
- SG0 package
- SG0 approval request
- SG0 approval step

The script is idempotent:

- Running it more than once does not duplicate HERE Technologies.
- Existing HERE workflow records are reset so the demo can be replayed.

Safety behavior:

- The script does not run automatically.
- It refuses non-local/non-dev Supabase URLs unless `ALLOW_REMOTE_DEMO_SEED=true`.

## Test login

After running `npm run seed:demo`, log in with:

```text
Email: demo.admin@example.com
Password: DemoAdmin123!
```

If you override these values in `.env.local`, use:

```text
Email: DEMO_ADMIN_EMAIL
Password: DEMO_ADMIN_PASSWORD
```

## Full MVP test flow

Use this flow to validate the HERE Technologies SG0 -> SG1 -> SG2 demo.

1. Reset demo data:

```bash
npm run seed:demo
```

2. Start the app:

```bash
npm run dev
```

3. Log in as the demo admin.

4. Open Dashboard.

5. Open HERE Technologies from the dashboard or Partners page.

6. Complete SG0 package/checklist:

   - Open the HERE Technologies Partner Detail page.
   - Open the current SG0 package.
   - Complete required SG0 package sections.
   - Complete SG0 checklist items if needed.

7. Submit SG0 for approval.

8. Open My Approvals.

9. Approve SG0.

10. Confirm HERE Technologies advances to SG1.

11. Open SG1 package.

12. Complete SG1 package/checklist:

   - Complete required SG1 package sections.
   - Complete SG1 checklist items.

13. Submit SG1 for approval.

14. Open My Approvals.

15. Approve SG1.

16. Confirm HERE Technologies advances to SG2.

17. Open SG2 package.

18. Complete SG2 package/checklist:

   - Complete required SG2 package sections.
   - Complete SG2 checklist items.

19. Submit SG2 for approval.

20. Open My Approvals to verify the SG2 approval request.

21. Open Decision Logs to verify decisions for approved/rework/rejected stage gates.

22. Open HERE Technologies Partner Detail and review tabs:

   - Overview
   - Checklist
   - Packages
   - Approvals
   - Decisions
   - Stage History

Expected result:

- HERE Technologies can move from SG0 to SG1 to SG2.
- SG1 and SG2 packages are created when the partner advances.
- Package progress and approval status are visible on Dashboard and Partner Detail.
- Decisions are visible in Decision Logs.

## Commands

```bash
npm run dev
npm run seed:demo
npm run check:supabase-embeds
npm run lint
npm run typecheck
npm run build
```

## Validation commands

Run before opening or updating a PR:

```bash
npm run check:supabase-embeds
npm run typecheck
npm run lint
npm run build
```

## Useful routes

```text
/dashboard
/partners
/approvals/my
/decisions
/packages
```
