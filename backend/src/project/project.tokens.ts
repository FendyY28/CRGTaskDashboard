/**
 * Injection tokens for the project domain's capability interfaces.
 *
 * Services depend on these ports (see `project.interfaces.ts`) rather than on
 * concrete infrastructure classes; the module binds each token to an
 * implementation. Kept in its own file so tests can import a token without
 * importing the whole module graph.
 */
export const PROJECT_ADAPTERS = {
  /** `ProjectDatabase` — the Prisma client surface the domain uses. */
  database: 'PROJECT_ADAPTERS_DATABASE',
  /** `AuditLogger` — audit-trail writer. */
  audit: 'PROJECT_ADAPTERS_AUDIT',
  /** `UserDirectory` — user id/email -> display name lookup. */
  users: 'PROJECT_ADAPTERS_USERS',
  /** `IdGenerator` — sequential id source. */
  ids: 'PROJECT_ADAPTERS_IDS',
  /** `ProjectSupportService` — shared 404/audit/recalc helpers. */
  support: 'PROJECT_ADAPTERS_SUPPORT',
} as const;

/**
 * Tokens for the feature services behind the ProjectService facade.
 *
 * They exist for the same reason as PROJECT_ADAPTERS: the facade takes its
 * collaborators by interface/port, and a token keeps the dependency explicit
 * in the module instead of relying on emitted design:paramtypes metadata.
 */
export const PROJECT_SERVICES = {
  lifecycle: 'PROJECT_SERVICES_LIFECYCLE',
  pir: 'PROJECT_SERVICES_PIR',
  weeklyLogs: 'PROJECT_SERVICES_WEEKLY_LOGS',
  testing: 'PROJECT_SERVICES_TESTING',
  sit: 'PROJECT_SERVICES_SIT',
  phaseNotes: 'PROJECT_SERVICES_PHASE_NOTES',
} as const;
