export type Role = "ADMIN" | "OFFICER" | "HEAD";

export const SDLC_PHASES = {
  REQUIREMENT: "Requirement",
  TF_MEETING: "TF Meeting",
  DEVELOPMENT: "Development",
  SIT: "SIT",
  UAT: "UAT",
  LIVE: "Live",
} as const;

/** Urutan fase SDLC dalam siklus project. */
export const SDLC_PHASE_ORDER = [
  SDLC_PHASES.REQUIREMENT,
  SDLC_PHASES.TF_MEETING,
  SDLC_PHASES.DEVELOPMENT,
  SDLC_PHASES.SIT,
  SDLC_PHASES.UAT,
  SDLC_PHASES.LIVE,
] as const;

/**
 * Pasangan label pendek <-> nama fase lengkap.
 * Satu-satunya sumber kebenaran untuk pemetaan "Req" -> "Requirement"
 * yang dipakai di chart analytics dan komponen timeline.
 */
export const PHASE_LABELS: ReadonlyArray<{ short: string; full: string }> = [
  { short: "Req", full: SDLC_PHASES.REQUIREMENT },
  { short: "TF", full: SDLC_PHASES.TF_MEETING },
  { short: "Dev", full: SDLC_PHASES.DEVELOPMENT },
  { short: "SIT", full: SDLC_PHASES.SIT },
  { short: "UAT", full: SDLC_PHASES.UAT },
  { short: "Live", full: SDLC_PHASES.LIVE },
];

export const PROJECT_STATUS = {
  ON_TRACK: "on-track",
  IN_PROGRESS: "in-progress",
  AT_RISK: "at-risk",
  OVERDUE: "overdue",
  COMPLETED: "completed",
  PENDING: "pending",
} as const;

export const TEST_CASE_STATUS = {
  PASS: "pass",
  FAIL: "fail",
  PENDING: "pending",
} as const;

export const TEST_CASE_TYPE = {
  POSITIVE: "positive",
  NEGATIVE: "negative",
} as const;

export const THEME = {
  TOSCA: "#38A79C",
  ORANGE: "#F5A328",
  BSI_GREEN: "#00A39D",
  BSI_YELLOW: "#F8AD3C",
  BSI_GREY: "#888B8D",
  BSI_WHITE: "#FFFFFF",
  BSI_DARK_GRAY: "#54565A",
  BSI_LIGHT_GRAY: "#76777A",
  BSI_LIGHT_GOLD: "#B0851E",
} as const;

export const PHASE_COLORS: Record<string, { solid: string; bg: string; border: string; text: string; light: string }> = {
  Requirement: { solid: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE", text: "#4338CA", light: "#E0E7FF" }, // Indigo
  "TF Meeting": { solid: "#0EA5E9", bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1", light: "#E0F2FE" }, // Sky Blue
  Development: { solid: "#00A39D", bg: "#F0FDFA", border: "#99F6E4", text: "#0F766E", light: "#CCFBF1" }, // BSI Tosca
  SIT: { solid: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", text: "#B45309", light: "#FEF3C7" },         // Amber
  UAT: { solid: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE", text: "#6D28D9", light: "#EDE9FE" },         // Purple
  Live: { solid: "#10B981", bg: "#ECFDF5", border: "#A7F3D0", text: "#047857", light: "#D1FAE5" }         // Emerald
};