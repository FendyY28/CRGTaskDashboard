/**
 * Pure text/normalisation helpers for project payloads.
 *
 * Everything here is dependency-free and side-effect-free so it can be unit
 * tested on its own and reused by any service without pulling in Prisma.
 */

/** Context sent alongside a task: the task name and its description. */
export interface TaskInput {
  taskName: string;
  description: string;
}

/** Collapse whitespace and trim; non-strings become an empty string. */
export const cleanText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

/**
 * Normalise one raw task payload (plain string or `{ taskName, description }`)
 * into {@link TaskInput}, or `null` when there is no usable name.
 */
export const normalizeTaskInput = (raw: unknown): TaskInput | null => {
  const isRecord = typeof raw === 'object' && raw !== null;
  const rawName = isRecord ? (raw as { taskName?: unknown }).taskName : raw;
  const rawDesc = isRecord ? (raw as { description?: unknown }).description : '';
  const taskName = cleanText(rawName);
  if (!taskName) return null;
  return { taskName, description: cleanText(rawDesc) };
};

/**
 * Turn raw task payloads into a clean list: trim/compact text, drop nameless
 * rows and dedup case-insensitively, keeping the first occurrence in order.
 */
export const parseTaskList = (rawTasks: unknown): TaskInput[] => {
  const list = Array.isArray(rawTasks) ? rawTasks : [rawTasks];
  const seen = new Set<string>();
  const tasks: TaskInput[] = [];

  for (const raw of list) {
    const task = normalizeTaskInput(raw);
    if (!task) continue;
    const key = task.taskName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push(task);
  }

  return tasks;
};

/** Return the first existing task whose name matches `taskName` (case-insensitive). */
export const findTaskByName = <T extends { taskName: string }>(
  existing: T[],
  taskName: string,
): T | undefined => {
  const key = taskName.toLowerCase();
  return existing.find((t) => t.taskName.toLowerCase() === key);
};

/** Comma-separated `"name"` list, used in the duplicate/validation messages. */
export const quoteNames = (names: string[]): string => names.map((n) => `"${n}"`).join(', ');

/** Format a sequential id without needing an instance: 7 -> `PRJ-007`, 1000 -> `PRJ-1000`. */
export const formatSequentialId = (prefix: string, num: number): string =>
  num < 1000 ? `${prefix}-${num.toString().padStart(3, '0')}` : `${prefix}-${num}`;

/**
 * Normalise an optional client-supplied issue id to the canonical `ISS-xxx`
 * shape. A bare number ("12") becomes "ISS-012" so the value still matches the
 * sequence regex used by the id generator; anything unusable falls back to a
 * generated id (`null`).
 */
export const normalizeIssueId = (rawIssueId: string | undefined | null): string | null => {
  const raw = (rawIssueId ?? '').trim();
  if (!raw) return null;

  const suffix = raw.toUpperCase().startsWith('ISS-') ? raw.slice(4) : raw;
  if (!suffix) return null;

  if (/^\d+$/.test(suffix)) {
    return formatSequentialId('ISS', parseInt(suffix, 10));
  }

  // Non-numeric custom codes are rejected so every stored id stays ISS-<digits>.
  return null;
};
