# DECISIONS, Resguardo (Week 8, Business Bending)

## Session 1 (2026-10-04): build
- **Slice:** SME Shield, narrow. Team 1 Blueprint primary vacuum. Declared as ADVERSARY: build the slice that has to survive my own kill criteria (no false confidence, no surveillance, justified price).
- **Name:** Resguardo. "Escudo" was already my Week 6 product, kept separate on purpose (own repo, own Supabase project).
- **Shadow clause by design:** the schema has no employee table and no per-person score. Inventory is by device/account role. Enforced in `supabase/schema.sql`.
- **No false security:** best status is "Sin hallazgos conocidos" with the disclaimer always attached. Banned wording is asserted in `scripts/verify.ts`.
- **Backup action is derived from evidence** (a dated restore test), never from a checkbox. Stale after 30 days.
- **AI is simulated and labeled "Simulado"** (free stack). High severity cannot close without a named human (enforced in the app and by a CHECK constraint in the database).
- **Real signal:** SPF/DMARC lookup through Cloudflare DNS-over-HTTPS, free, no key. Only the domain the owner typed is sent.
- Known limit: DNS live check could not run inside the build sandbox (network blocked); verified on the deployed URL in Session 2.

## Session 2 (2026-10-04): deploy and test
- **Deploy 1:** Vercel + new Supabase project (RLS on every table) + Google OAuth. Live at resguardo-one.vercel.app.
- **Mechanical pass, bugs found on the live URL and fixed (each one has a regression case in `scripts/verify.ts`):**
  1. Email-check advice asked for SPF and DMARC even when SPF existed. Advice now derives from what the lookup found (`emailAdvice`).
  2. Backup form defaulted to tomorrow every evening in Mexico (server UTC date). Now `todayMx()`; impossible dates like Feb 31 are rejected.
  3. Timestamps showed UTC and doubled punctuation ("a.m.."). One `formatMx()` formatter, Mexico City time, 24h clock.
- **Persona test (Lupita, 46, Gmail):** fixes chosen with the owner of the project, worst first:
  1. WORST: opening a case with no contacts was a dead end. Inline "add a person" form on the case; confirming-person field now explains who to name and says to call first. No self-confirm shortcut: a human must still confirm.
  2. Gmail/Outlook/Yahoo users were told to "ask whoever manages your domain". Free-mail providers are detected; the app says the provider runs those rules and points to 2-step verification.
  3. Plain language for SPF/DMARC; raw records behind "Ver detalle técnico".
- **Found while testing:** no way back to a case from inside the app. Added "Tus casos" card on the dashboard and a `/incidents` list (open and waiting first). Reason: Blueprint condition 4, a forgotten high-severity case means human responsibility disappeared.
- **Known limits (not fixed, written down):** the email check only covers the domain given at onboarding and there is no profile edit; duplicate same-day backup tests are accepted; the dashboard has no "start here"; the card-terminal mention in action 2 shows even if no terminal was ticked.

## Tomorrow's first move
Save `docs/mockup.png` into the repo, run the fresh-chat persona and merge its log into PERSONA, record the demo video, export the PDFs.
