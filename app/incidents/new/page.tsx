import { requireOwner } from "@/lib/session";
import { openIncident } from "@/app/actions";
import { KIND_LABEL } from "@/lib/triage";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewIncident({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireOwner();
  const { error } = await searchParams;
  return (
    <Shell title="Tengo un problema" subtitle="Respira. Te decimos qué hacer primero y quién debe revisarlo.">
      <Card>
        <CardContent className="p-6">
          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">Elige qué pasó y descríbelo en una o dos frases.</p>}
          <form action={openIncident} className="flex flex-col gap-4 text-sm">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium">¿Qué pasó?</legend>
              {Object.entries(KIND_LABEL).map(([k, label]) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="radio" name="kind" value={k} required /> {label}
                </label>
              ))}
            </fieldset>
            <label className="font-medium">
              Cuéntalo con tus palabras (sin contraseñas ni datos de tarjetas)
              <textarea name="description" required minLength={5} maxLength={500} rows={4} className="mt-1 w-full rounded-md border border-input p-3" />
            </label>
            <Button type="submit" variant="destructive">Abrir caso</Button>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}
