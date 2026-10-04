import { requireOwner } from "@/lib/session";
import { runEmailCheck } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EmailCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, business } = await requireOwner();
  const { error } = await searchParams;
  const { data } = await supabase
    .from("email_checks")
    .select("domain, spf, dmarc, dmarc_policy, checked_at")
    .eq("business_id", business.id)
    .order("checked_at", { ascending: false })
    .limit(1);
  const last = data?.[0];

  return (
    <Shell title="Protección de tu correo de negocio" subtitle="Revisión real y pública. No pide contraseñas.">
      {!business.domain && (
        <p className="mb-4 rounded-md border bg-muted p-3 text-sm">
          No registraste un dominio propio, así que no hay nada público que revisar. Usa un
          correo exclusivo del negocio y marca la acción 4 como hecha con una nota.
        </p>
      )}
      {error === "dns" && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-800">No pudimos consultar el DNS ahora. Intenta de nuevo en unos minutos.</p>}
      {business.domain && (
        <form action={runEmailCheck} className="mb-6">
          <Button type="submit">Revisar {business.domain}</Button>
        </form>
      )}
      {last && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado para {last.domain}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={last.spf ? "success" : "warning"}>SPF {last.spf ? "publicado" : "no encontrado"}</Badge>
              <Badge variant={last.dmarc ? (last.dmarc_policy === "none" ? "warning" : "success") : "warning"}>
                DMARC {last.dmarc ? `publicado (p=${last.dmarc_policy ?? "?"})` : "no encontrado"}
              </Badge>
            </div>
            <dl className="grid gap-1 rounded-md bg-muted p-3">
              <div><dt className="inline font-medium">Qué pasó: </dt><dd className="inline">
                {!last.spf && !last.dmarc
                  ? "Tu dominio no publica reglas contra suplantación."
                  : last.dmarc_policy === "none"
                    ? "DMARC solo observa, no bloquea correos falsos."
                    : "Hay reglas publicadas contra suplantación."}
              </dd></div>
              <div><dt className="inline font-medium">Qué hacer: </dt><dd className="inline">
                Pide a quien administra tu dominio que publique SPF y DMARC y suba DMARC a
                quarantine o reject.
              </dd></div>
              <div><dt className="inline font-medium">Responsable: </dt><dd className="inline">Quien administra tu dominio (anótalo en Contactos)</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Consulta hecha el {new Date(last.checked_at).toLocaleString("es-MX")}. Esto reduce
              suplantaciones, no las elimina, y no revisa tus cuentas ni tus equipos.
            </p>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
