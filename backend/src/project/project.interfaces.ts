import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { SequencedModel } from './project.constants';

/**
 * Ports (dependency-inversion) the project services depend on.
 *
 * The services only need *something* that can run queries and something that
 * can write an audit entry — never the concrete AuditService or the Prisma
 * client class. Declaring the capabilities here keeps the domain code free of
 * infrastructure details and lets a test swap in a plain object, with no
 * `as unknown as PrismaService` cast.
 */

/**
 * The subset of `PrismaService` the project domain uses. `$transaction` keeps
 * Prisma's own overloads so both the callback form and the array form stay
 * type-checked for the caller.
 */
export type ProjectDatabase = Pick<PrismaService, '$transaction'> & {
  project: PrismaService['project'];
  sDLCPhase: PrismaService['sDLCPhase'];
  phaseNote: PrismaService['phaseNote'];
  weeklyProgress: PrismaService['weeklyProgress'];
  task: PrismaService['task'];
  issue: PrismaService['issue'];
  improvement: PrismaService['improvement'];
  testCase: PrismaService['testCase'];
  defect: PrismaService['defect'];
  sitProcess: PrismaService['sitProcess'];
  user: PrismaService['user'];
};

/** Anything able to record one audit-trail entry. */
export interface AuditLogger {
  log(userId: string, action: string, details: string, projectId?: string): Promise<unknown>;
}

/** Read-only user lookup used to resolve an actor's display name. */
export interface UserDirectory {
  /** Display name for a user id or email, or `null` when there is no such user. */
  findDisplayName(userIdOrEmail: string): Promise<string | null>;
}

/**
 * Source of human-readable sequential ids (`PRJ-001`, `TSK-014`, ...).
 * `db` scopes the lookup to an open transaction so ids generated inside the
 * same batch see each other.
 */
export interface IdGenerator {
  nextId(
    prefix: string,
    model: SequencedModel,
    db?: Prisma.TransactionClient | ProjectDatabase,
  ): Promise<string>;

  /**
   * Insert a row whose id is generated sequentially, regenerating the id and
   * retrying when a concurrent request claimed the same one first.
   */
  insertWithGeneratedId<T>(
    generateId: () => Promise<string>,
    insert: (id: string) => Promise<T>,
    entityLabel: string,
  ): Promise<T>;
}
