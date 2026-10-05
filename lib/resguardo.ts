// Core domain logic for Resguardo. Rule-based and explainable on purpose:
// no model, no score of people, no "safe" status (Blueprint conditions 3, 5, 6).

export type ActionCode =
  | "backup_restore"
  | "mfa_accounts"
  | "updates"
  | "email_protection"
  | "incident_contact";

export type Asset = {
  id: string;
  kind: "device" | "account";
  label: string;
  platform: string;
  has_mfa: boolean;
  auto_updates: boolean;
};

export type ActionRow = {
  id: string;
  code: ActionCode;
  status: "pending" | "done";
  owner_role: string;
  due_date: string;
  done_note: string | null;
  done_at: string | null;
};

export type BackupTest = { tested_on: string; restored_ok: boolean; note: string | null };
export type EmailCheck = {
  domain: string;
  spf: string | null;
  dmarc: string | null;
  dmarc_policy: string | null;
  checked_at: string;
};

export const BACKUP_STALE_DAYS = 30;

export const ACTION_CATALOG: Record<
  ActionCode,
  { title: string; why: string; steps: string[]; href?: string; hrefLabel?: string }
> = {
  backup_restore: {
    title: "Probar que tu respaldo se puede restaurar",
    why: "Un respaldo que nunca se probó es una suposición. Si el negocio pierde sus fotos de facturas, pedidos o ventas, esto decide si reabres en un día o en un mes.",
    steps: [
      "Elige un archivo importante (por ejemplo, la foto de una factura).",
      "Intenta recuperarlo desde tu respaldo en otro dispositivo.",
      "Anota aquí la fecha y si funcionó.",
    ],
    href: "/backup",
    hrefLabel: "Registrar prueba de respaldo",
  },
  mfa_accounts: {
    title: "Activar verificación en 2 pasos en tus cuentas clave",
    why: "Con tu correo y tu WhatsApp Business alguien puede pedir dinero a tus clientes como si fuera tu negocio. La verificación en 2 pasos bloquea la mayoría de esos robos.",
    steps: [
      "Correo del negocio: Ajustes de la cuenta de Google, Seguridad, Verificación en 2 pasos.",
      "WhatsApp Business: Ajustes, Cuenta, Verificación en dos pasos.",
      "Banco o terminal de cobro: pregunta en tu banco cómo activarla.",
    ],
  },
  updates: {
    title: "Actualizar el equipo de ventas y activar actualizaciones automáticas",
    why: "Los ataques más comunes usan fallas que ya tienen arreglo. Una tableta sin actualizar es la puerta más fácil.",
    steps: [
      "En la tableta o el celular de ventas: Ajustes, Sistema, Actualización de software.",
      "Instala lo pendiente y activa las actualizaciones automáticas.",
    ],
  },
  email_protection: {
    title: "Revisar que nadie pueda hacerse pasar por tu correo de negocio",
    why: "Si tu dominio no está protegido, un estafador puede enviar correos que parecen tuyos a tus clientes y proveedores.",
    steps: [
      "Si tienes dominio propio, corre la revisión de abajo (es una consulta pública, no pide contraseñas).",
      "Si no tienes dominio propio, usa un correo exclusivo del negocio y no lo mezcles con el personal.",
    ],
    href: "/email-check",
    hrefLabel: "Revisar mi correo de negocio",
  },
  incident_contact: {
    title: "Anotar a quién llamar si pasa algo",
    why: "En un mal día nadie piensa bien. Tener un nombre y un teléfono escritos antes ahorra horas de pánico.",
    steps: [
      "Agrega al menos una persona de confianza (familiar, consultor, soporte del banco).",
      "Guarda su teléfono o correo aquí.",
    ],
    href: "/contacts",
    hrefLabel: "Agregar contactos",
  },
};

export const ACTION_CODES = Object.keys(ACTION_CATALOG) as ActionCode[];

export function daysSince(dateStr: string, now = new Date()): number {
  const d = new Date(dateStr + (dateStr.length === 10 ? "T00:00:00" : ""));
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

export function latestBackup(tests: BackupTest[]): BackupTest | null {
  return (
    [...tests].sort((a, b) => b.tested_on.localeCompare(a.tested_on))[0] ?? null
  );
}

export function backupState(
  tests: BackupTest[],
  now = new Date(),
): { state: "none" | "stale" | "failed" | "fresh"; days: number | null } {
  const last = latestBackup(tests);
  if (!last) return { state: "none", days: null };
  const days = daysSince(last.tested_on, now);
  if (!last.restored_ok) return { state: "failed", days };
  if (days > BACKUP_STALE_DAYS) return { state: "stale", days };
  return { state: "fresh", days };
}

export type ActionView = {
  code: ActionCode;
  title: string;
  why: string;
  steps: string[];
  href?: string;
  hrefLabel?: string;
  row: ActionRow;
  done: boolean;
  priority: number;
  finding: { happened: string; todo: string; who: string };
};

type Ctx = {
  assets: Asset[];
  backups: BackupTest[];
  responderCount: number;
  hasDomain: boolean;
  /** Name of the free-mail provider (Google, Microsoft...) when the "domain" is e.g. gmail.com. */
  freeMailProvider?: string | null;
  lastEmailCheck: EmailCheck | null;
  now?: Date;
};

// Priority is explainable: each rule adds weight for a concrete, checkable fact.
export function buildActionViews(rows: ActionRow[], ctx: Ctx): ActionView[] {
  const now = ctx.now ?? new Date();
  const accountsNoMfa = ctx.assets.filter((a) => a.kind === "account" && !a.has_mfa);
  const devicesNoUpdates = ctx.assets.filter((a) => a.kind === "device" && !a.auto_updates);
  const backup = backupState(ctx.backups, now);

  const views: ActionView[] = [];
  for (const code of ACTION_CODES) {
    const row = rows.find((r) => r.code === code);
    if (!row) continue;
    const cat = ACTION_CATALOG[code];
    let done = row.status === "done";
    let priority = 10;
    let finding = { happened: "", todo: "", who: row.owner_role };

    if (code === "backup_restore") {
      // Derived from evidence, never from a checkbox: "done" means a restore test is fresh.
      done = backup.state === "fresh";
      priority = done ? 15 : 100;
      finding = {
        happened:
          backup.state === "none"
            ? "Nunca has probado restaurar tu respaldo."
            : backup.state === "failed"
              ? "Tu última prueba de restauración falló."
              : backup.state === "stale"
                ? `Tu última prueba fue hace ${backup.days} días (el límite es ${BACKUP_STALE_DAYS}).`
                : `Tu última prueba salió bien hace ${backup.days} días.`,
        todo: done
          ? "Repite la prueba antes de que pasen 30 días."
          : "Restaura un archivo real desde tu respaldo y registra el resultado.",
        who: row.owner_role,
      };
    } else if (code === "mfa_accounts") {
      priority = done ? 12 : 60 + accountsNoMfa.length * 10;
      finding = {
        happened: accountsNoMfa.length
          ? `${accountsNoMfa.length} cuenta(s) sin verificación en 2 pasos: ${accountsNoMfa.map((a) => a.label).join(", ")}.`
          : "Todas las cuentas que registraste dicen tener verificación en 2 pasos (lo declaraste tú).",
        todo: accountsNoMfa.length
          ? "Actívala en cada una y marca la acción como hecha con una nota."
          : "Revisa cada tres meses que siga activa.",
        who: row.owner_role,
      };
    } else if (code === "updates") {
      priority = done ? 11 : 50 + devicesNoUpdates.length * 10;
      finding = {
        happened: devicesNoUpdates.length
          ? `${devicesNoUpdates.length} equipo(s) sin actualizaciones automáticas: ${devicesNoUpdates.map((a) => a.label).join(", ")}.`
          : "Todos los equipos registrados dicen tener actualizaciones automáticas (lo declaraste tú).",
        todo: devicesNoUpdates.length
          ? "Instala lo pendiente y activa las actualizaciones automáticas."
          : "Revisa de vez en cuando que sigan al día.",
        who: row.owner_role,
      };
    } else if (code === "email_protection") {
      const c = ctx.lastEmailCheck;
      const weak = !c || !c.spf || !c.dmarc || c.dmarc_policy === "none";
      priority = done ? 13 : ctx.hasDomain ? (weak ? 70 : 20) : 40;
      if (ctx.freeMailProvider) {
        // Persona test: telling a Gmail user to "ask whoever manages your domain" is nonsense.
        finding = {
          happened: `Tu correo es de ${ctx.freeMailProvider}, que ya administra esas reglas por ti.`,
          todo: "No hay nada que pedir. Activa la verificación en 2 pasos (acción 2) y marca esta acción como hecha con una nota.",
          who: row.owner_role,
        };
        priority = done ? 13 : 40;
      } else finding = {
        happened: !ctx.hasDomain
          ? "No registraste un dominio propio, así que no hay nada público que revisar."
          : !c
            ? "Aún no has corrido la revisión de tu dominio."
            : !c.spf && !c.dmarc
              ? "Tu dominio no publica SPF ni DMARC: cualquiera puede enviar correos que parecen tuyos."
              : !c.spf
                ? "Tu dominio no publica SPF."
                : !c.dmarc
                  ? "Tu dominio no publica DMARC."
                  : c.dmarc_policy === "none"
                    ? "DMARC existe pero solo observa (p=none): no bloquea correos falsos."
                    : "SPF y DMARC están publicados. Esto reduce suplantaciones, no las elimina.",
        todo: !ctx.hasDomain
          ? "Usa un correo exclusivo del negocio y marca la acción hecha con una nota."
          : "Pide a quien administra tu dominio que publique o endurezca SPF y DMARC.",
        who: row.owner_role,
      };
    } else if (code === "incident_contact") {
      done = ctx.responderCount > 0;
      priority = done ? 14 : 80;
      finding = {
        happened: done
          ? `Tienes ${ctx.responderCount} contacto(s) anotado(s).`
          : "Si hoy pasara algo, no hay a quién llamar anotado.",
        todo: done ? "Confirma cada seis meses que sigan siendo correctos." : "Agrega al menos un contacto.",
        who: row.owner_role,
      };
    }
    views.push({ code, ...cat, row, done, priority, finding });
  }
  // Pending first by priority, done last. Always exactly five.
  return views.sort((a, b) => Number(a.done) - Number(b.done) || b.priority - a.priority);
}

// Banned wording is enforced in tests: no status string may ever claim safety.
export const STATUS_LABEL = {
  done: "Hecho",
  pending: "Pendiente",
};

export const NO_FALSE_SECURITY =
  "Sin hallazgos conocidos no significa que estés seguro. Resguardo solo revisa lo que tú le dices y lo que es público.";

export const NOT_PROTECTED: string[] = [
  "No es un antivirus: no escanea tus equipos ni detecta virus.",
  "No vigila a tus empleados ni mide a nadie. No guardamos datos de personas.",
  "No sabe si tu respaldo funciona: solo guarda cuándo alguien lo probó.",
  "No bloquea ataques en tiempo real ni sustituye a un especialista.",
  "Lo que registras como 'tiene verificación' o 'actualizado' lo declaras tú, no lo comprobamos.",
];

export const ASSET_PRESETS = [
  { key: "tablet_ventas", kind: "device", label: "Tableta o celular de ventas", platform: "android" },
  { key: "terminal_cobro", kind: "device", label: "Terminal de cobro", platform: "android" },
  { key: "whatsapp_business", kind: "account", label: "WhatsApp Business", platform: "android" },
  { key: "correo_negocio", kind: "account", label: "Correo del negocio", platform: "web" },
  { key: "redes_sociales", kind: "account", label: "Página de Facebook o Instagram", platform: "web" },
] as const;
