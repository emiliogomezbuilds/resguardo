import { requireOwner } from "@/lib/session";
import { recordBackup } from "@/app/actions";
import { BACKUP_STALE_DAYS, backupState, type BackupTest } from "@/lib/resguardo";
import { todayMx } from "@/lib/validate";
import { Shell } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BackupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, business } = await requireOwner();
  const { error } = await searchParams;
  const { data } = await supabase
    .from("backup_tests")
    .select("tested_on, restored_ok, note")
    .eq("business_id", business.id)
    .order("tested_on", { ascending: false });
  const tests = (data ?? []) as BackupTest[];
  const state = backupState(tests);
  const today = todayMx();

  return (
    <Shell title="Prueba de respaldo" subtitle="Un respaldo solo cuenta si alguien lo restauró.">
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={state.state === "fresh" ? "success" : "warning"}>
              {state.state === "fresh" && "Prueba reciente"}
              {state.state === "stale" && "Prueba vencida"}
              {state.state === "failed" && "Última prueba falló"}
              {state.state === "none" && "Sin pruebas"}
            </Badge>
            {state.days !== null && <span>Última prueba hace {state.days} día(s).</span>}
          </div>
          <p className="text-muted-foreground">
            Resguardo no puede ver tu respaldo. Solo guarda lo que tú registras y avisa cuando pasan
            más de {BACKUP_STALE_DAYS} días sin una prueba exitosa.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Registrar una prueba</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">Revisa la fecha (no puede ser futura) y el resultado.</p>}
          <form action={recordBackup} className="flex flex-col gap-3 text-sm">
            <label className="font-medium">
              ¿Cuándo la hiciste?
              <input type="date" name="tested_on" required max={today} defaultValue={today} className="mt-1 h-10 w-full rounded-md border border-input px-3" />
            </label>
            <fieldset className="flex gap-4">
              <label className="flex items-center gap-2"><input type="radio" name="restored_ok" value="yes" required /> Sí pude recuperar el archivo</label>
              <label className="flex items-center gap-2"><input type="radio" name="restored_ok" value="no" /> No pude</label>
            </fieldset>
            <label className="font-medium">
              Nota (qué archivo probaste)
              <input name="note" maxLength={300} className="mt-1 h-10 w-full rounded-md border border-input px-3" placeholder="Foto de factura del lunes" />
            </label>
            <Button type="submit">Guardar prueba</Button>
          </form>
        </CardContent>
      </Card>

      <h2 className="mb-2 text-lg font-semibold">Historial</h2>
      <ul className="flex flex-col gap-2 text-sm">
        {tests.length === 0 && <li className="text-muted-foreground">Aún no hay pruebas.</li>}
        {tests.map((t, i) => (
          <li key={i} className="rounded-md border p-3">
            <strong>{t.tested_on}</strong> · {t.restored_ok ? "Funcionó" : "No funcionó"}
            {t.note ? ` · ${t.note}` : ""}
          </li>
        ))}
      </ul>
    </Shell>
  );
}
