"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTION_CODES, ASSET_PRESETS } from "@/lib/resguardo";
import { checkEmailProtection, freeMailProvider, normalizeDomain } from "@/lib/dns";
import { simulatedTriage, type IncidentKind } from "@/lib/triage";
import { isoDate, oneOf, text } from "@/lib/validate";


async function requireBusiness() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, domain")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  return { supabase, user: auth.user, business };
}

export async function createBusiness(formData: FormData) {
  const { supabase, user, business } = await requireBusiness();
  if (business) redirect("/dashboard");

  const name = text(formData.get("name"), 2, 80);
  const sector = text(formData.get("sector"), 2, 60);
  const band = oneOf(formData.get("employees_band"), ["1-5", "6-15", "16-50"] as const);
  const rawDomain = text(formData.get("domain"), 0, 100);
  const domain = rawDomain ? normalizeDomain(rawDomain) : null;
  if (!name || !sector || !band || (rawDomain && !domain)) {
    redirect("/onboarding?error=invalid");
  }

  const { data: created, error } = await supabase
    .from("businesses")
    .insert({ owner_id: user.id, name, sector, employees_band: band, domain })
    .select("id")
    .single();
  if (error || !created) redirect("/onboarding?error=save");

  const assets = ASSET_PRESETS.filter((p) => formData.get(p.key) === "on").map((p) => ({
    business_id: created.id,
    kind: p.kind,
    label: p.label,
    platform: p.platform,
    has_mfa: p.kind === "account" && formData.get(`${p.key}_flag`) === "on",
    auto_updates: p.kind === "device" && formData.get(`${p.key}_flag`) === "on",
  }));
  if (assets.length) await supabase.from("assets").insert(assets);

  await supabase.from("actions").insert(
    ACTION_CODES.map((code) => ({ business_id: created.id, code })),
  );
  redirect("/dashboard");
}

export async function markActionDone(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const id = text(formData.get("id"), 36, 36);
  const note = text(formData.get("note"), 3, 300);
  if (!id || !note) redirect("/dashboard?error=note");
  await supabase
    .from("actions")
    .update({ status: "done", done_note: note, done_at: new Date().toISOString() })
    .eq("id", id)
    .in("code", ["mfa_accounts", "updates", "email_protection"]);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function reopenAction(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const id = text(formData.get("id"), 36, 36);
  if (id) {
    await supabase
      .from("actions")
      .update({ status: "pending", done_note: null, done_at: null })
      .eq("id", id);
  }
  redirect("/dashboard");
}

export async function recordBackup(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const tested_on = isoDate(formData.get("tested_on"));
  const restored_ok = oneOf(formData.get("restored_ok"), ["yes", "no"] as const);
  const rawNote = text(formData.get("note"), 0, 300);
  if (!tested_on || !restored_ok) redirect("/backup?error=invalid");
  await supabase.from("backup_tests").insert({
    business_id: business.id,
    tested_on,
    restored_ok: restored_ok === "yes",
    note: rawNote || null,
  });
  revalidatePath("/dashboard");
  redirect("/backup");
}

export async function runEmailCheck() {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const domain = business.domain ? normalizeDomain(business.domain) : null;
  if (!domain) redirect("/email-check?error=nodomain");
  // Free-mail (gmail.com, outlook.com...) is run by the provider: nothing of hers to check.
  if (freeMailProvider(domain)) redirect("/email-check");
  let finding;
  try {
    finding = await checkEmailProtection(domain);
  } catch {
    redirect("/email-check?error=dns");
  }
  await supabase.from("email_checks").insert({
    business_id: business.id,
    domain,
    spf: finding.spf,
    dmarc: finding.dmarc,
    dmarc_policy: finding.dmarc_policy,
  });
  revalidatePath("/dashboard");
  redirect("/email-check");
}

export async function addResponder(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const name = text(formData.get("name"), 2, 60);
  const role = text(formData.get("role"), 2, 60);
  const contact = text(formData.get("contact"), 3, 80);
  // Optional: come back to an open incident (persona test: no contacts = dead end mid-incident).
  // Only a strict UUID is accepted, so this can never become an open redirect.
  const rawBack = text(formData.get("return_incident"), 36, 36);
  const back = rawBack && /^[0-9a-f-]{36}$/i.test(rawBack) ? rawBack : null;
  if (!name || !role || !contact) redirect(back ? `/incidents/${back}?error=contact` : "/contacts?error=invalid");
  await supabase.from("responders").insert({ business_id: business.id, name, role, contact });
  revalidatePath("/dashboard");
  redirect(back ? `/incidents/${back}` : "/contacts");
}

export async function deleteResponder(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const id = text(formData.get("id"), 36, 36);
  if (id) await supabase.from("responders").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/contacts");
}

export async function openIncident(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const kind = oneOf(formData.get("kind"), [
    "phishing",
    "account_takeover",
    "lost_device",
    "ransomware",
    "other",
  ] as const);
  const description = text(formData.get("description"), 5, 500);
  if (!kind || !description) redirect("/incidents/new?error=invalid");
  const triage = simulatedTriage(kind as IncidentKind);
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      business_id: business.id,
      kind,
      description,
      severity: triage.severity,
      status: triage.severity === "high" ? "awaiting_human" : "open",
    })
    .select("id")
    .single();
  if (error || !data) redirect("/incidents/new?error=save");
  redirect(`/incidents/${data.id}`);
}

export async function raiseSeverity(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const id = text(formData.get("id"), 36, 36);
  if (!id) redirect("/dashboard");
  await supabase
    .from("incidents")
    .update({ severity: "high", status: "awaiting_human" })
    .eq("id", id)
    .neq("status", "closed");
  redirect(`/incidents/${id}`);
}

export async function closeIncident(formData: FormData) {
  const { supabase, business } = await requireBusiness();
  if (!business) redirect("/onboarding");
  const id = text(formData.get("id"), 36, 36);
  const note = text(formData.get("close_note"), 3, 300);
  const confirmedBy = text(formData.get("confirmed_by"), 2, 60);
  if (!id || !note) redirect(`/incidents/${id ?? ""}?error=note`);

  const { data: inc } = await supabase
    .from("incidents")
    .select("severity")
    .eq("id", id)
    .maybeSingle();
  if (!inc) redirect("/dashboard");
  // Condition 4: high severity cannot close without a named human confirmation.
  if (inc.severity === "high" && !confirmedBy) redirect(`/incidents/${id}?error=human`);

  await supabase
    .from("incidents")
    .update({
      status: "closed",
      close_note: note,
      confirmed_by: confirmedBy,
      closed_at: new Date().toISOString(),
    })
    .eq("id", id);
  redirect(`/incidents/${id}`);
}
