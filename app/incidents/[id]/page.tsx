import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { addResponder, closeIncident, raiseSeverity } from "@/app/actions";
import { KIND_LABEL, simulatedTriage, type IncidentKind } from "@/lib/triage";
import { formatMx } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IncidentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, business } = await requireOwner();
  const { data: inc } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  if (!inc) notFound();
  const { data: responders } = await supabase
    .from("responders")
    .select("id, name, role, contact")
    .eq("business_id", business.id);
  const triage = simulatedTriage(inc.kind as IncidentKind);
  const closed = inc.status === "closed";
  const high = inc.severity === "high";

  return (
    <Shell title={KIND_LABEL[inc.kind as IncidentKind]} subtitle={`Abierto el ${formatMx(inc.created_at)} (hora de Ciudad de México)`}>
      <div className="mb-4 flex items-center gap-2">
        <Badge variant={high ? "destructive" : "warning"}>Gravedad {inc.severity === "high" ? "alta" : inc.severity === "medium" ? "media" : "baja"}</Badge>
        <Badge variant={closed ? "success" : "outline"}>
          {closed ? "Cerrado" : inc.status === "awaiting_human" ? "Esperando a una persona" : "Abierto"}
        </Badge>
      </div>
      <p className="mb-4 rounded-md border p-3 text-sm">{inc.description}</p>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Qué hacer ahora <Badge variant="outline" className="ml-2">Simulado</Badge></CardTitle>
          <p className="text-xs text-muted-foreground">Sugerencia automática basada en reglas, no un especialista. {triage.humanNote}</p>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {triage.steps.map((s) => (<li key={s}>{s}</li>))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Quién es responsable</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {(responders ?? []).length === 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-red-800">Todavía no tienes a nadie anotado. Anota ahora a una persona de confianza (familiar, soporte de tu banco o quien te ayuda con la computadora) y llámale.</p>
              {error === "contact" && <p className="rounded-md bg-red-50 p-2 text-red-800">Revisa los tres campos: nombre, quién es y su teléfono o correo.</p>}
              {!closed && (
                <form action={addResponder} className="grid gap-2 sm:grid-cols-3">
                  <input type="hidden" name="return_incident" value={inc.id} />
                  <input name="name" required minLength={2} maxLength={60} placeholder="Nombre (ej. Ana)" className="h-10 rounded-md border border-input px-3" />
                  <input name="role" required minLength={2} maxLength={60} placeholder="Quién es (ej. sobrina)" className="h-10 rounded-md border border-input px-3" />
                  <input name="contact" required minLength={3} maxLength={80} placeholder="Teléfono o correo" className="h-10 rounded-md border border-input px-3" />
                  <div className="sm:col-span-3"><Button type="submit" variant="outline" size="sm">Anotar a esta persona</Button></div>
                </form>
              )}
            </div>
          ) : (
            <ul className="space-y-1">
              {(responders ?? []).map((r) => (<li key={r.id}><strong>{r.name}</strong> · {r.role} · {r.contact}</li>))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!closed && !high && (
        <form action={raiseSeverity} className="mb-6">
          <input type="hidden" name="id" value={inc.id} />
          <Button variant="outline" size="sm" type="submit">Ya hice clic o di datos: subir a gravedad alta</Button>
        </form>
      )}

      {closed ? (
        <p className="rounded-md bg-green-50 p-3 text-sm text-green-900">
          Cerrado el {formatMx(inc.closed_at!)} (hora de Ciudad de México) · Nota: {inc.close_note}
          {inc.confirmed_by ? ` · Confirmado por: ${inc.confirmed_by}` : ""} · Cerrar un caso no significa que tu negocio esté seguro.
        </p>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Cerrar el caso</CardTitle></CardHeader>
          <CardContent>
            {error === "human" && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">Un caso de gravedad alta necesita el nombre de la persona que lo confirmó.</p>}
            {error === "note" && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">Escribe una nota corta de cómo terminó.</p>}
            <form action={closeIncident} className="flex flex-col gap-3 text-sm">
              <input type="hidden" name="id" value={inc.id} />
              {high && (
                <label className="font-medium">
                  Persona que lo revisó contigo (obligatorio en gravedad alta)
                  <input name="confirmed_by" required minLength={2} maxLength={60} list="responder-names" className="mt-1 h-10 w-full rounded-md border border-input px-3" placeholder="Ej. Ana, o el soporte de mi banco" />
                  <datalist id="responder-names">
                    {(responders ?? []).map((r) => (<option key={r.id} value={r.name} />))}
                  </datalist>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Escribe el nombre de la persona con quien hablaste y que vio el problema. Si todavía no hablaste con nadie, no cierres el caso: llama primero.
                  </span>
                </label>
              )}
              <label className="font-medium">
                Cómo terminó
                <input name="close_note" required minLength={3} maxLength={300} className="mt-1 h-10 w-full rounded-md border border-input px-3" />
              </label>
              <Button type="submit">Cerrar caso</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
