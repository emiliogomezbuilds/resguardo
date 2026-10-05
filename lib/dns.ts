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

// Plain-language finding (happened / todo) derived ONLY from what the lookup found.
// Bug found in the live mechanical test: the "todo" text used to ask for SPF and DMARC
// even when SPF was already published, which would confuse a non-technical owner.
export function emailAdvice(f: Pick<EmailFinding, "spf" | "dmarc" | "dmarc_policy">): {
  happened: string;
  todo: string;
} {
  if (!f.spf && !f.dmarc) {
    return {
      happened: "Tu dominio no publica reglas contra suplantación.",
      todo: "Pide a quien administra tu dominio que publique SPF y DMARC.",
    };
  }
  if (!f.spf) {
    return {
      happened: "Falta SPF: cualquiera podría enviar correos que parecen tuyos.",
      todo: "Pide a quien administra tu dominio que publique SPF.",
    };
  }
  if (!f.dmarc) {
    return {
      happened: "SPF está publicado, pero falta DMARC.",
      todo: "Pide a quien administra tu dominio que publique DMARC.",
    };
  }
  if (f.dmarc_policy === "none") {
    return {
      happened: "DMARC solo observa, no bloquea correos falsos.",
      todo: "Pide a quien administra tu dominio que suba DMARC a quarantine o reject.",
    };
  }
  return {
    happened: "Hay reglas publicadas contra suplantación (SPF y DMARC).",
    todo: "No hay nada nuevo que pedir hoy. Vuelve a revisar en unos meses.",
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
