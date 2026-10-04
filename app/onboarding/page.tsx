import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/app/actions";
import { ASSET_PRESETS } from "@/lib/resguardo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Onboarding({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (existing) redirect("/dashboard");
  const { error } = await searchParams;

  const input = "h-10 w-full rounded-md border border-input px-3 text-sm";
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Cuéntanos de tu negocio (3 minutos)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Solo pedimos lo mínimo. No pedimos nombres de empleados ni contraseñas. Lo que
            marques aquí lo declaras tú; Resguardo no lo comprueba.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">
              Revisa los datos: el nombre y el giro son obligatorios, y el dominio debe verse
              como minegocio.com.mx.
            </p>
          )}
          <form action={createBusiness} className="flex flex-col gap-4">
            <label className="text-sm font-medium">
              Nombre del negocio
              <input name="name" required minLength={2} maxLength={80} className={input} placeholder="Papelería La Esperanza" />
            </label>
            <label className="text-sm font-medium">
              ¿A qué se dedica?
              <input name="sector" required minLength={2} maxLength={60} className={input} placeholder="Papelería y cafetería" />
            </label>
            <label className="text-sm font-medium">
              ¿Cuántas personas trabajan?
              <select name="employees_band" required className={input} defaultValue="1-5">
                <option value="1-5">1 a 5</option>
                <option value="6-15">6 a 15</option>
                <option value="16-50">16 a 50</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Dominio de tu correo o página (opcional)
              <input name="domain" maxLength={100} className={input} placeholder="minegocio.com.mx" />
            </label>

            <fieldset className="flex flex-col gap-3 rounded-md border p-3">
              <legend className="px-1 text-sm font-medium">¿Qué usa tu negocio?</legend>
              {ASSET_PRESETS.map((p) => (
                <div key={p.key} className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name={p.key} defaultChecked={p.key !== "terminal_cobro"} />
                    {p.label}
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground">
                    <input type="checkbox" name={`${p.key}_flag`} />
                    {p.kind === "account" ? "ya tiene verificación en 2 pasos" : "ya se actualiza solo"}
                  </label>
                </div>
              ))}
            </fieldset>

            <Button type="submit">Ver mis 5 acciones</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
