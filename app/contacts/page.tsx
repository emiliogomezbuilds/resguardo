import { requireOwner } from "@/lib/session";
import { addResponder, deleteResponder } from "@/app/actions";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, business } = await requireOwner();
  const { error } = await searchParams;
  const { data } = await supabase
    .from("responders")
    .select("id, name, role, contact")
    .eq("business_id", business.id)
    .order("created_at");
  const input = "mt-1 h-10 w-full rounded-md border border-input px-3 text-sm";

  return (
    <Shell title="A quién llamar" subtitle="Personas reales que te ayudan cuando algo pasa.">
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Agregar contacto</CardTitle></CardHeader>
        <CardContent>
          {error && <p className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-800">Completa nombre, rol y un teléfono o correo.</p>}
          <form action={addResponder} className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium">Nombre<input name="name" required minLength={2} maxLength={60} className={input} placeholder="Mi sobrino Luis" /></label>
            <label className="text-sm font-medium">Rol<input name="role" required minLength={2} maxLength={60} className={input} placeholder="Ayuda con computadoras" /></label>
            <label className="text-sm font-medium">Teléfono o correo<input name="contact" required minLength={3} maxLength={80} className={input} placeholder="55 0000 0000" /></label>
            <div className="sm:col-span-3"><Button type="submit">Guardar contacto</Button></div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Usa contactos tuyos. Para pruebas, inventa nombres y números: no uses datos reales de otras personas.</p>
        </CardContent>
      </Card>
      <ul className="flex flex-col gap-2">
        {(data ?? []).length === 0 && <li className="text-sm text-muted-foreground">Todavía no hay contactos.</li>}
        {(data ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
            <span><strong>{r.name}</strong> · {r.role} · {r.contact}</span>
            <form action={deleteResponder}>
              <input type="hidden" name="id" value={r.id} />
              <Button size="sm" variant="ghost" type="submit">Quitar</Button>
            </form>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
