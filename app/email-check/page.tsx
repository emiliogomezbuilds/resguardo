import { requireOwner } from "@/lib/session";
import { runEmailCheck } from "@/app/actions";
import { emailAdvice, freeMailProvider } from "@/lib/dns";
import { formatMx } from "@/lib/format";
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
  const provider = freeMailProvider(business.domain);
  const advice = last ? emailAdvice(last, last.domain) : null;

  return (
    <Shell title="Protección de tu correo de negocio" subtitle="Revisión real y pública. No pide contraseñas.">
      {!business.domain && (
        <p className="mb-4 rounded-md border bg-muted p-3 text-sm">
          No registraste un dominio propio, así que no hay nada público que revisar. Usa un
          correo exclusivo del negocio y marca la acción 4 como hecha con una nota.
        </p>
      )}
      {error === "dns" && <p className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-800">No pudimos consultar el DNS ahora. Intenta de nuevo en unos minutos.</p>}
      {provider && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tu correo es de {provider}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <dl className="grid gap-1 rounded-md bg-muted p-3">
              <div><dt className="inline font-medium">Qué pasó: </dt><dd className="inline">{provider} administra las reglas contra correos falsos de {business.domain}. No hay nada público tuyo que revisar.</dd></div>
              <div><dt className="inline font-medium">Qué hacer: </dt><dd className="inline">No hay nada que pedir. Lo que sí ayuda es activar la verificación en 2 pasos en esa cuenta (acción 2).</dd></div>
              <div><dt className="inline font-medium">Responsable: </dt><dd className="inline">{provider}, y tú al activar la verificación</dd></div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Esta revisión es para negocios con dominio propio (por ejemplo minegocio.com.mx).
            </p>
          </CardContent>
        </Card>
      )}
      {business.domain && !provider && (
        <form action={runEmailCheck} className="mb-6">
          <Button type="submit">Revisar {business.domain}</Button>
        </form>
      )}
      {!provider && last && advice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado para {last.domain}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={last.spf ? "success" : "warning"}>Lista de remitentes (SPF): {last.spf ? "sí" : "no"}</Badge>
              <Badge variant={last.dmarc ? (last.dmarc_policy === "none" ? "warning" : "success") : "warning"}>
                Freno a correos falsos (DMARC): {last.dmarc ? (last.dmarc_policy === "none" ? "solo observa" : "activo") : "no"}
              </Badge>
            </div>
            <dl className="grid gap-1 rounded-md bg-muted p-3">
              <div><dt className="inline font-medium">Qué pasó: </dt><dd className="inline">{advice.happened}</dd></div>
              <div><dt className="inline font-medium">Qué hacer: </dt><dd className="inline">{advice.todo}</dd></div>
              <div><dt className="inline font-medium">Responsable: </dt><dd className="inline">{advice.who}</dd></div>
            </dl>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Ver detalle técnico</summary>
              <p className="mt-1 break-all">SPF: {last.spf ?? "no encontrado"}</p>
              <p className="break-all">DMARC: {last.dmarc ?? "no encontrado"}</p>
            </details>
            <p className="text-xs text-muted-foreground">
              Consulta hecha el {formatMx(last.checked_at)} (hora de Ciudad de México). Esto reduce
              suplantaciones, no las elimina, y no revisa tus cuentas ni tus equipos.
            </p>
          </CardContent>
        </Card>
      )}
    </Shell>
  );
}
