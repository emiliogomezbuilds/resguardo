import Link from "next/link";
import { requireOwner } from "@/lib/session";
import { KIND_LABEL } from "@/lib/triage";
import { formatMx } from "@/lib/format";
import {
  incidentStatusLabel,
  isOpenIncident,
  severityLabel,
  sortIncidents,
  type IncidentRow,
} from "@/lib/incidents";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function IncidentsPage() {
  const { supabase, business } = await requireOwner();
  const { data } = await supabase
    .from("incidents")
    .select("id, kind, severity, status, created_at, closed_at")
    .eq("business_id", business.id);
  const rows = sortIncidents((data ?? []) as IncidentRow[]);
  const open = rows.filter(isOpenIncident);

  return (
    <Shell title="Tus casos" subtitle="Todo lo que has reportado, lo abierto primero.">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Badge variant={open.length ? "warning" : "default"}>
          {open.length ? `${open.length} abierto(s)` : "Ningún caso abierto"}
        </Badge>
        <Button asChild variant="destructive" size="sm">
          <Link href="/incidents/new">Tengo un problema</Link>
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="rounded-md border bg-muted p-3 text-sm">
          Aún no has reportado nada. Si algo pasa, usa el botón rojo.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((i) => (
          <li key={i.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <Link className="font-medium underline" href={`/incidents/${i.id}`}>
                    {KIND_LABEL[i.kind]}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Abierto el {formatMx(i.created_at)}
                    {i.closed_at ? ` · Cerrado el ${formatMx(i.closed_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={i.severity === "high" ? "destructive" : "warning"}>
                    Gravedad {severityLabel(i.severity)}
                  </Badge>
                  <Badge variant={i.status === "closed" ? "success" : "outline"}>
                    {incidentStatusLabel(i.status)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
