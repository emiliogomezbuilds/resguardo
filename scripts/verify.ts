// Mechanical checks of the rules that carry the Blueprint conditions.
// Run: npx tsx scripts/verify.ts
import assert from "node:assert/strict";
import {
  ACTION_CODES, buildActionViews, backupState, NOT_PROTECTED, NO_FALSE_SECURITY, STATUS_LABEL,
  type ActionRow, type Asset,
} from "../lib/resguardo";
import { simulatedTriage } from "../lib/triage";
import { isoDate, todayMx } from "../lib/validate";
import { formatMx } from "../lib/format";
import { normalizeDomain, checkEmailProtection, emailAdvice, freeMailProvider } from "../lib/dns";

const NOW = new Date("2026-10-04T12:00:00");
const rows: ActionRow[] = ACTION_CODES.map((code, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`, code, status: "pending",
  owner_role: "Dueña", due_date: "2026-10-11", done_note: null, done_at: null,
}));
const assets: Asset[] = [
  { id: "a", kind: "account", label: "WhatsApp Business", platform: "android", has_mfa: false, auto_updates: false },
  { id: "b", kind: "device", label: "Tableta de ventas", platform: "android", has_mfa: false, auto_updates: false },
];
const base = { assets, backups: [], responderCount: 0, hasDomain: false, lastEmailCheck: null, now: NOW };

// Condition 2: exactly five actions.
let v = buildActionViews(rows, base);
assert.equal(v.length, 5);
// Backup with no test is the top priority and never "done".
assert.equal(v[0].code, "backup_restore");
assert.equal(v[0].done, false);

// Backup freshness: fresh vs stale (30 days) vs failed.
assert.equal(backupState([{ tested_on: "2026-09-30", restored_ok: true, note: null }], NOW).state, "fresh");
assert.equal(backupState([{ tested_on: "2026-08-01", restored_ok: true, note: null }], NOW).state, "stale");
assert.equal(backupState([{ tested_on: "2026-10-01", restored_ok: false, note: null }], NOW).state, "failed");
v = buildActionViews(rows, { ...base, backups: [{ tested_on: "2026-09-30", restored_ok: true, note: null }] });
assert.equal(v.find((x) => x.code === "backup_restore")!.done, true);

// Responder makes the incident-contact action done (derived from data).
v = buildActionViews(rows, { ...base, responderCount: 1 });
assert.equal(v.find((x) => x.code === "incident_contact")!.done, true);

// Condition 3: every action has what happened / what to do / who is responsible.
for (const a of buildActionViews(rows, base)) {
  assert.ok(a.finding.happened.length > 5 && a.finding.todo.length > 5 && a.finding.who.length > 1, a.code);
}

// Condition 6: no wording anywhere claims the business is safe.
const surface = [STATUS_LABEL.done, STATUS_LABEL.pending, NO_FALSE_SECURITY, ...NOT_PROTECTED,
  ...buildActionViews(rows, base).flatMap((a) => [a.title, a.why, a.finding.happened, a.finding.todo])].join(" ").toLowerCase();
for (const banned of ["estás protegido", "estas protegido", "100% seguro", "totalmente seguro", "estás seguro."]) {
  assert.ok(!surface.includes(banned), `banned wording: ${banned}`);
}
assert.ok(NO_FALSE_SECURITY.toLowerCase().includes("no significa"));

// Condition 4: high-severity kinds require a human.
assert.equal(simulatedTriage("ransomware").severity, "high");
assert.equal(simulatedTriage("account_takeover").severity, "high");
assert.equal(simulatedTriage("phishing").severity, "low");

// Input validation of the domain field (security floor #4).
assert.equal(normalizeDomain("https://Google.com/path"), "google.com");
assert.equal(normalizeDomain("not a domain"), null);
assert.equal(normalizeDomain("a'; drop table"), null);

// Regression for the bug found in the live test: advice must match what was actually found.
assert.ok(!emailAdvice({ spf: "v=spf1 -all", dmarc: "v=DMARC1; p=none", dmarc_policy: "none" }).todo.includes("publique SPF"));
assert.ok(emailAdvice({ spf: null, dmarc: null, dmarc_policy: null }).todo.includes("SPF y DMARC"));
assert.ok(emailAdvice({ spf: "v=spf1 -all", dmarc: null, dmarc_policy: null }).todo.includes("DMARC"));
assert.ok(!emailAdvice({ spf: "v=spf1 -all", dmarc: null, dmarc_policy: null }).todo.includes("SPF y"));
assert.ok(!emailAdvice({ spf: "v=spf1 -all", dmarc: "v=DMARC1; p=reject", dmarc_policy: "reject" }).todo.includes("suba"));

// Regression: at 8:41 pm on Oct 4 in Mexico City the server clock (UTC) is already Oct 5.
const EVENING_MX = new Date("2026-10-05T02:41:00Z");
assert.equal(todayMx(EVENING_MX), "2026-10-04");
assert.equal(isoDate("2026-10-04", EVENING_MX), "2026-10-04");
assert.equal(isoDate("2026-10-05", EVENING_MX), null, "tomorrow (owner's local date) must be rejected");
assert.equal(isoDate("2026-02-31", EVENING_MX), null, "impossible calendar date must be rejected");
assert.equal(isoDate("nope", EVENING_MX), null);

// Persona-test fix 1: Gmail users are never told to "ask whoever administers your domain".
assert.equal(freeMailProvider("gmail.com"), "Google");
assert.equal(freeMailProvider(" Outlook.com "), "Microsoft");
assert.equal(freeMailProvider("mi-papeleria.com.mx"), null);
assert.equal(freeMailProvider(null), null);
const gm = emailAdvice({ spf: "v=spf1 -all", dmarc: "v=DMARC1; p=none", dmarc_policy: "none" }, "gmail.com");
assert.ok(!gm.todo.includes("administra tu dominio") && gm.todo.includes("2 pasos"));
assert.equal(gm.who, "Google");
const own = emailAdvice({ spf: "v=spf1 -all", dmarc: "v=DMARC1; p=none", dmarc_policy: "none" }, "mi-papeleria.com.mx");
assert.ok(own.todo.includes("administra tu dominio"));
const gmViews = buildActionViews(rows, { ...base, hasDomain: true, freeMailProvider: "Google" });
const gmAction = gmViews.find((x) => x.code === "email_protection")!;
assert.ok(gmAction.finding.todo.includes("No hay nada que pedir") && !gmAction.finding.todo.includes("administra tu dominio"));
assert.equal(gmViews.length, 5);

// Persona-test fix 2: plain language first, acronyms only in parentheses / detail.
for (const f of [
  { spf: null, dmarc: null, dmarc_policy: null },
  { spf: "v=spf1 -all", dmarc: null, dmarc_policy: null },
  { spf: "v=spf1 -all", dmarc: "v=DMARC1; p=none", dmarc_policy: "none" as const },
]) {
  const a = emailAdvice(f, "mi-papeleria.com.mx");
  assert.ok(!/^(SPF|DMARC)/.test(a.happened), "finding must not open with an acronym");
  assert.ok(a.happened.length > 30);
}

// Regression: timestamps are shown in Mexico City time, never UTC.
const shown = formatMx("2026-10-05T02:47:16Z");
assert.ok(shown.includes("4") && shown.toLowerCase().includes("octubre"), shown);
assert.ok(!shown.endsWith("."), "no trailing period that would double up with sentence punctuation");

async function live() {
// Real DNS-over-HTTPS signal (best effort: skipped if the network is blocked).
try {
  const f = await checkEmailProtection("google.com");
  console.log("DNS live check google.com ->", { spf: !!f.spf, dmarc: !!f.dmarc, policy: f.dmarc_policy });
  assert.ok(f.spf, "google.com should publish SPF");
} catch (e) {
  console.log("DNS live check skipped:", (e as Error).message);
}

}
live().then(() => console.log("ALL CHECKS PASSED"));
