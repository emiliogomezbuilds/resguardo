// Case list helpers. Persona test: once a case was opened there was no way back to it from
// inside the app, so a high-severity case "waiting for a person" could be forgotten.
// Blueprint condition 4 (human responsibility cannot disappear) needs open cases to be visible.
import type { IncidentKind } from "@/lib/triage";

export type IncidentRow = {
  id: string;
  kind: IncidentKind;
  severity: "low" | "medium" | "high";
  status: "open" | "awaiting_human" | "closed";
  created_at: string;
  closed_at: string | null;
};

export const isOpenIncident = (i: Pick<IncidentRow, "status">) => i.status !== "closed";

const RANK: Record<IncidentRow["status"], number> = { awaiting_human: 0, open: 1, closed: 2 };

/** Waiting-for-a-person first, then other open cases, then closed; newest first inside each group. */
export function sortIncidents<T extends IncidentRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => RANK[a.status] - RANK[b.status] || b.created_at.localeCompare(a.created_at),
  );
}

export function severityLabel(s: IncidentRow["severity"]): string {
  return s === "high" ? "alta" : s === "medium" ? "media" : "baja";
}

export function incidentStatusLabel(s: IncidentRow["status"]): string {
  return s === "closed" ? "Cerrado" : s === "awaiting_human" ? "Esperando a una persona" : "Abierto";
}
