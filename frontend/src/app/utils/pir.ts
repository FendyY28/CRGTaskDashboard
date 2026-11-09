import type { ImprovementNote, ProjectIssue } from "../types";

export type PIRItem = ProjectIssue | ImprovementNote;

/** Lowercase and turn `-`/`_` into spaces so "in-progress" === "In Progress". */
export const normalizeStr = (str?: string): string =>
  str ? str.toLowerCase().replace(/[-_]/g, " ").trim() : "";

/** Issues carry `projectId`, improvements only reach us with a resolved `projectName`. */
export const getItemProjectId = (item: PIRItem): string | undefined =>
  (item as ProjectIssue).projectId;

/** Date an item is ordered/stamped by: improvements are created, issues reported. */
export const getItemDate = (item: PIRItem): string | undefined =>
  item.type === "improvement"
    ? (item as ImprovementNote).createdDate
    : (item as ProjectIssue).reportedDate;

/** The API identifies items by numeric id; some fixtures only carry the code. */
export const getItemId = (item: PIRItem): number | undefined =>
  item.id ?? Number((item as ProjectIssue).issueId ?? (item as ImprovementNote).noteId);
