# DECISIONS, Resguardo (Week 8, Business Bending)

## Session 1 (2026-10-04)
- **Slice:** SME Shield, narrow. Team 1 Blueprint primary vacuum. Declared as ADVERSARY: build the slice that has to survive my own kill criteria (no false confidence, no surveillance, justified price).
- **Name:** Resguardo. "Escudo" was already my Week 6 product, kept separate on purpose (own repo, own Supabase project).
- **Shadow clause by design:** the schema has no employee table and no per-person score. Inventory is by device/account role. Enforced in `supabase/schema.sql`.
- **No false security:** best status is "Sin hallazgos conocidos" with the disclaimer always attached. Banned wording is asserted in `scripts/verify.ts`.
- **Backup action is derived from evidence** (a dated restore test), never from a checkbox. Stale after 30 days.
- **AI is simulated and labeled "Simulado"** (free stack). High severity cannot close without a named human (enforced in the app and by a CHECK constraint in the database).
- **Real signal:** SPF/DMARC lookup through Cloudflare DNS-over-HTTPS, free, no key. Only the domain the owner typed is sent.
- Known limit: DNS live check could not run inside the build sandbox (network blocked); verify on the deployed URL.

## Tomorrow's first move
Create the Supabase project, run `supabase/schema.sql`, set env vars in Vercel, deploy, run the mechanical pass.
