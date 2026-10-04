export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-foreground">
      <h1 className="mb-6 text-2xl font-semibold">Aviso de privacidad — Resguardo</h1>
      <p className="mb-4">
        Resguardo es un proyecto académico (Week 8, Business Bending). Este aviso explica, de forma
        simple, qué datos se usan y cómo.
      </p>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Qué guardamos</h2>
      <p className="mb-4">
        Al entrar con Google guardamos tu correo para identificar tu cuenta. Después guardamos lo
        que tú escribes: nombre del negocio, giro, dominio opcional, una lista de equipos y
        cuentas por tipo (por ejemplo &ldquo;WhatsApp Business&rdquo;), fechas de pruebas de respaldo y
        contactos de confianza. No guardamos datos de empleados, no medimos ni calificamos a
        ninguna persona y no instalamos nada en tus equipos.
      </p>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Qué consultamos fuera</h2>
      <p className="mb-4">
        La revisión de correo hace una consulta pública de DNS (registros SPF y DMARC) sobre el
        dominio que tú registras. No enviamos contraseñas ni datos personales.
      </p>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Lo que Resguardo no hace</h2>
      <p className="mb-4">
        Resguardo no garantiza que tu negocio esté seguro. Las sugerencias del asistente son
        simuladas y no sustituyen a un especialista.
      </p>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Con quién se comparte</h2>
      <p className="mb-4">Con nadie. Tus datos solo son visibles para tu cuenta.</p>
      <h2 className="mb-2 mt-6 text-lg font-semibold">Contacto</h2>
      <p>Para preguntas sobre este proyecto: emilio.gmz.gnz@gmail.com</p>
    </div>
  );
}
