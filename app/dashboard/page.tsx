import Link from "next/link";
import { requireOwner } from "@/lib/session";
import { markActionDone, reopenAction } from "@/app/actions";
import {
  buildActionViews,
  NOT_PROTECTED,
  STATUS_LABEL,
  type ActionRow,
  type Asset,
  type BackupTest,
  type EmailCheck,
} from "@/lib/resguardo";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, business } = await requireOwner();
  const { error } = await searchParams;

  const [{ data: rows }, { data: assets }, { data: backups }, { data: checks }, { count }] =
    await Promise.all([
      supabase.from("actions").select("*").eq("business_id", business.id),
      supabase.from("assets").select("*").eq("business_id", business.id),
      supabase.from("backup_tests").select("tested_on, restored_ok, note").eq("business_id", business.id),
      supabase
        .from("email_checks")
        .select("domain, spf, dmarc, dmarc_policy, checked_at")
        .eq("business_id", business.id)
        .order("checked_at", { ascending: false })
        .limit(1),
      supabase.from("responders").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    ]);

  const views = buildActionViews((rows ?? []) as ActionRow[], {
    assets: (assets ?? []) as Asset[],
    backups: (backups ?? []) as BackupTest[],
    responderCount: count ?? 0,
    hasDomain: !!business.domain,
    lastEmailCheck: ((checks ?? [])[0] as EmailCheck | undefined) ?? null,
  });
  const pending = views.filter((v) => !v.done).length;

  return (
    <Shell title={business.name} subtitle={`${business.sector} · ${business.employees_band} personas`}>
      {error === "note" && (
        <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-800">
          Para marcarla como hecha, escribe una nota corta de lo que hiciste (mínimo 3 letras).
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Tus 5 acciones prioritarias</h2>
            <Badge variant={pending ? "warning" : "default"}>
              {pending ? `${pending} pendiente(s)` : "Sin hallazgos conocidos"}
            </Badge>
          </div>
          {!pending && (
            <p className="rounded-md border bg-muted p-3 text-sm">
              Sin hallazgos conocidos <strong>no significa seguro</strong>. Solo revisamos lo que
              tú declaras y lo que es público.
            </p>
          )}
          {views.map((v, i) => (
            <Card key={v.code}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">
                    {i + 1}. {v.title}
                  </CardTitle>
                  <Badge variant={v.done ? "success" : "warning"}>
                    {v.done ? STATUS_LABEL.done : STATUS_LABEL.pending}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{v.why}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm">
                <dl className="grid gap-1 rounded-md bg-muted p-3">
                  <div><dt className="inline font-medium">Qué pasó: </dt><dd className="inline">{v.finding.happened}</dd></div>
                  <div><dt className="inline font-medium">Qué hacer: </dt><dd className="inline">{v.finding.todo}</dd></div>
                  <div><dt className="inline font-medium">Responsable: </dt><dd className="inline">{v.finding.who}</dd></div>
                  <div><dt className="inline font-medium">Fecha límite: </dt><dd className="inline">{v.row.due_date}</dd></div>
                </dl>
                <ol className="list-decimal pl-5 text-muted-foreground">
                  {v.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap items-center gap-2">
                  {v.href && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={v.href}>{v.hrefLabel}</Link>
                    </Button>
                  )}
                  {["mfa_accounts", "updates", "email_protection"].includes(v.code) &&
                    (v.row.status === "done" ? (
                      <form action={reopenAction}>
                        <input type="hidden" name="id" value={v.row.id} />
                        <Button size="sm" variant="ghost" type="submit">Reabrir</Button>
                      </form>
                    ) : (
                      <form action={markActionDone} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={v.row.id} />
                        <input
                          name="note"
                          required
                          minLength={3}
                          maxLength={300}
                          placeholder="Qué hiciste (nota corta)"
                          className="h-9 rounded-md border border-input px-3 text-sm"
                        />
                        <Button size="sm" type="submit">Marcar hecha</Button>
                      </form>
                    ))}
                </div>
                {v.row.done_note && <p className="text-xs text-muted-foreground">Nota: {v.row.done_note}</p>}
              </CardContent>
            </Card>
          ))}
        </section>

        <aside className="flex flex-col gap-4">
          <Button asChild variant="destructive" size="lg">
            <Link href="/incidents/new">Tengo un problema</Link>
          </Button>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lo que Resguardo NO protege</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {NOT_PROTECTED.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">La cuenta de la continuidad</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Resguardo se vende por continuidad, no por seguridad. Ejemplo ilustrativo (supuestos
                tuyos, no datos): si una semana cerrado te cuesta $15,000 y un plan costara $199 al
                mes, el plan se paga si evita una semana cerrada cada 6 años.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </Shell>
  );
}
