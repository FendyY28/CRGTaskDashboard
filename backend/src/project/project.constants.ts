import { Prisma } from '@prisma/client';
import { MASTER_PHASES, type MasterPhase } from './dto/create-project.dto';

/** The SDLC phases every project goes through, in order. */
export const PHASE_SEQUENCE: readonly MasterPhase[] = MASTER_PHASES;

/** The first phase of a freshly created project or cycle. */
export const DEFAULT_PHASE: MasterPhase = 'Requirement';

/** Max retries when a generated sequential id collides under concurrency. */
export const ID_COLLISION_RETRIES = 3;

/**
 * Bentuk relasi project yang dipakai findAll(), findOne(), dan update().
 * Ditaruh di satu tempat supaya penambahan/penghapusan relasi cukup diubah
 * sekali dan response ketiga endpoint tidak pernah berbeda bentuk.
 */
export const PROJECT_INCLUDE = {
  sdlcPhases: {
    include: { notes: { orderBy: { createdAt: 'desc' } } },
    orderBy: [{ cycle: 'asc' }, { id: 'asc' }],
  },
  weeklyProgress: {
    include: { tasks: { orderBy: { id: 'asc' } } },
    orderBy: { id: 'desc' },
  },
  testCases: { include: { defect: true } },
  issues: { orderBy: { reportedDate: 'desc' } },
  improvements: { orderBy: { createdDate: 'desc' } },
} satisfies Prisma.ProjectInclude;

/** Prisma models that carry a human-readable sequential id (`PREFIX-001`). */
export type SequencedModel = 'project' | 'task' | 'issue' | 'improvement';
