export type Role = "ADMIN" | "OFFICER" | "HEAD";

export const SDLC_PHASES = {
  REQUIREMENT: "Requirement",
  TF_MEETING: "TF Meeting",
  DEVELOPMENT: "Development",
  SIT: "SIT",
  UAT: "UAT",
  LIVE: "Live",
} as const;

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