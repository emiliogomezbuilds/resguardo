import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NO_FALSE_SECURITY } from "@/lib/resguardo";

export function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-sm font-semibold text-blue-700">
            Resguardo
          </Link>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="underline" href="/dashboard">Inicio</Link>
          <Link className="underline" href="/backup">Respaldo</Link>
          <Link className="underline" href="/email-check">Correo</Link>
          <Link className="underline" href="/contacts">Contactos</Link>
          <form action="/logout" method="post">
            <Button variant="outline" size="sm" type="submit">Salir</Button>
          </form>
        </nav>
      </header>
      {children}
      <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
        <p>{NO_FALSE_SECURITY}</p>
        <p className="mt-1">
          Proyecto académico. Los datos de ejemplo son inventados y las respuestas del asistente
          están marcadas como &ldquo;Simulado&rdquo;. <Link className="underline" href="/privacy">Aviso de privacidad</Link>
        </p>
      </footer>
    </div>
  );
}
