import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { closeIncident, raiseSeverity } from "@/app/actions";
import { KIND_LABEL, simulatedTriage, type IncidentKind } from "@/lib/triage";
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
    <Shell title={KIND_LABEL[inc.kind as IncidentKind]} subtitle={`Abierto el ${new Date(inc.created_at).toLocaleString("es-MX")}`}>
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
            <p className="text-red-800">No tienes contactos anotados. Agrégalos en <a className="underline" href="/contacts">Contactos</a> y llama a alguien de confianza ahora.</p>
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
          Cerrado el {new Date(inc.closed_at!).toLocaleString("es-MX")}. Nota: {inc.close_note}
          {inc.confirmed_by ? ` · Confirmado por: ${inc.confirmed_by}` : ""}. Cerrar un caso no significa que tu negocio esté seguro.
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
                  Persona que lo confirmó (obligatorio en gravedad alta)
                  <input name="confirmed_by" required minLength={2} maxLength={60} className="mt-1 h-10 w-full rounded-md border border-input px-3" placeholder="Nombre de la persona" />
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
