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