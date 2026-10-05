// Real security signal: public SPF/DMARC lookup through Cloudflare DNS-over-HTTPS.
// Free, no API key. We only send a domain name the owner typed, never credentials.

const DOMAIN_RE = /^(?=.{3,100}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return DOMAIN_RE.test(d) ? d : null;
}

type DohAnswer = { name: string; type: number; data: string };

async function txt(name: string): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
  const res = await fetch(url, {
    headers: { accept: "application/dns-json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`DNS ${res.status}`);
  const json = (await res.json()) as { Answer?: DohAnswer[] };
  return (json.Answer ?? [])
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s*"/g, ""));
}

export type EmailFinding = {
  spf: string | null;
  dmarc: string | null;
  dmarc_policy: "none" | "quarantine" | "reject" | null;
};

// Free-mail providers: the owner does NOT administer their DNS, so asking her to "ask whoever
// manages your domain" is nonsense. Persona test (Lupita, Gmail): the worst trust-breaker.
const FREE_MAIL: Record<string, string> = {
  "gmail.com": "Google",
  "googlemail.com": "Google",
  "outlook.com": "Microsoft",
  "hotmail.com": "Microsoft",
  "live.com": "Microsoft",
  "msn.com": "Microsoft",
  "yahoo.com": "Yahoo",
  "yahoo.com.mx": "Yahoo",
  "icloud.com": "Apple",
  "me.com": "Apple",
  "proton.me": "Proton",
  "protonmail.com": "Proton",
  "aol.com": "AOL",
};

export function freeMailProvider(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return FREE_MAIL[domain.trim().toLowerCase()] ?? null;
}

// Plain-language finding derived ONLY from what the lookup found (and who runs the domain).
// Acronyms stay in parentheses for the technical reader; the sentence works without them.
export function emailAdvice(
  f: Pick<EmailFinding, "spf" | "dmarc" | "dmarc_policy">,
  domain?: string | null,
): { happened: string; todo: string; who: string } {
  const provider = freeMailProvider(domain);
  if (provider) {
    return {
      happened: `Tu correo es de ${provider}. Ellos administran estas reglas, no tú.`,
      todo: "No hay nada que pedir aquí. Lo que sí ayuda es activar la verificación en 2 pasos en esa cuenta (acción 2).",
      who: provider,
    };
  }
  const who = "Quien administra tu dominio (anótalo en Contactos)";
  if (!f.spf && !f.dmarc) {
    return {
      happened: "Tu dominio no tiene reglas que impidan que otros manden correos con el nombre de tu negocio.",
      todo: "Pide a quien administra tu dominio que publique SPF y DMARC (esas reglas).",
      who,
    };
  }
  if (!f.spf) {
    return {
      happened: "Falta la lista de quién puede mandar correos por tu negocio (SPF).",
      todo: "Pide a quien administra tu dominio que publique SPF.",
      who,
    };
  }
  if (!f.dmarc) {
    return {
      happened: "Tienes la lista de remitentes (SPF), pero falta decirle al mundo qué hacer con los correos falsos (DMARC).",
      todo: "Pide a quien administra tu dominio que publique DMARC.",
      who,
    };
  }
  if (f.dmarc_policy === "none") {
    return {
      happened: "Tu dominio avisa quién puede mandar correos por ti, pero no frena a los falsos: solo observa.",
      todo: "Pide a quien administra tu dominio que suba DMARC a quarantine o reject (que los falsos se aparten o se rechacen).",
      who,
    };
  }
  return {
    happened: "Hay reglas publicadas contra suplantación (SPF y DMARC).",
    todo: "No hay nada nuevo que pedir hoy. Vuelve a revisar en unos meses.",
    who,
  };
}

export async function checkEmailProtection(domain: string): Promise<EmailFinding> {
  const [root, dm] = await Promise.all([txt(domain), txt(`_dmarc.${domain}`)]);
  const spf = root.find((r) => r.toLowerCase().startsWith("v=spf1")) ?? null;
  const dmarc = dm.find((r) => r.toUpperCase().startsWith("V=DMARC1")) ?? null;
  const m = dmarc?.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)/i);
  return {
    spf,
    dmarc,
    dmarc_policy: (m?.[1]?.toLowerCase() as EmailFinding["dmarc_policy"]) ?? null,
  };
}
