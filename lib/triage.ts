// SIMULATED triage assistant. Deterministic rules, no model call (free stack).
// Every screen that shows this output labels it "Simulado". Blueprint condition 4:
// it recommends, a human decides. High severity cannot be closed without a human.

export type IncidentKind =
  | "phishing"
  | "account_takeover"
  | "lost_device"
  | "ransomware"
  | "other";

export const KIND_LABEL: Record<IncidentKind, string> = {
  phishing: "Recibí un mensaje o enlace sospechoso",
  account_takeover: "Alguien entró a una de mis cuentas",
  lost_device: "Perdí o me robaron un equipo",
  ransomware: "Mis archivos se bloquearon o piden un pago",
  other: "Otro problema",
};

export type Triage = {
  severity: "low" | "medium" | "high";
  steps: string[];
  humanNote: string;
};

export function simulatedTriage(kind: IncidentKind): Triage {
  switch (kind) {
    case "ransomware":
      return {
        severity: "high",
        steps: [
          "Apaga el equipo afectado de internet (desconecta el Wi-Fi). No lo formatees todavía.",
          "No pagues ni contestes al mensaje de rescate.",
          "Llama a tu contacto de confianza ahora. Esto necesita una persona.",
          "Revisa la fecha de tu última prueba de respaldo.",
        ],
        humanNote: "Gravedad alta: requiere confirmación de una persona antes de cerrarlo.",
      };
    case "account_takeover":
      return {
        severity: "high",
        steps: [
          "Cambia la contraseña de esa cuenta desde un equipo de confianza.",
          "Activa la verificación en 2 pasos si no la tenía.",
          "Avisa a tus clientes si escribieron a tu nombre pidiendo dinero.",
          "Revisa si la misma contraseña se usa en otras cuentas.",
        ],
        humanNote: "Gravedad alta: requiere confirmación de una persona antes de cerrarlo.",
      };
    case "lost_device":
      return {
        severity: "medium",
        steps: [
          "Bloquea o borra el equipo a distancia desde la cuenta de Google o Apple.",
          "Cierra sesiones abiertas de correo y WhatsApp Business desde otro equipo.",
          "Cambia contraseñas de las cuentas que estaban abiertas.",
        ],
        humanNote: "Un familiar o tu contacto de confianza puede ayudarte con los pasos.",
      };
    case "phishing":
      return {
        severity: "low",
        steps: [
          "No abras el enlace ni descargues el archivo.",
          "Si ya diste una contraseña, cámbiala ahora y activa la verificación en 2 pasos.",
          "Borra el mensaje y avisa a tu equipo para que no caigan.",
        ],
        humanNote: "Si ya hiciste clic o diste datos, cambia la gravedad a alta y llama a tu contacto.",
      };
    default:
      return {
        severity: "medium",
        steps: [
          "Anota qué pasó, cuándo y qué equipo o cuenta estaba involucrado.",
          "Llama a tu contacto de confianza y cuéntale lo que anotaste.",
        ],
        humanNote: "No reconocemos este caso: una persona debe revisarlo.",
      };
  }
}
