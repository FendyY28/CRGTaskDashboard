import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ID_COLLISION_RETRIES, type SequencedModel } from './project.constants';
import type { IdGenerator, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import { formatSequentialId } from './project-text.utils';

/** How many retries are announced when a sequential id keeps colliding. */
const MAX_ATTEMPTS = ID_COLLISION_RETRIES + 1;

/**
 * Generates sequential, human-readable ids (`PRJ-001`, `ISS-012`, ...) by
 * scanning the current maximum for the prefix (+1), and inserts rows with
 * them, retrying when two concurrent requests generate the same id.
 *
 * Single responsibility: id sequencing + collision recovery. Kept out of the
 * feature services so their business logic is not entangled with it.
 */
@Injectable()
export class SequentialIdService implements IdGenerator {
  constructor(@Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase) { }

  async nextId(
    prefix: string,
    model: SequencedModel,
    db: Prisma.TransactionClient | ProjectDatabase = this.db,
  ): Promise<string> {
    const idList = await this.listExistingIds(db, model);

    const regex = new RegExp(`^${prefix}-(\\d{1,6})$`);
    let maxNum = 0;
    for (const idStr of idList) {
      const match = idStr?.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    return formatSequentialId(prefix, maxNum + 1);
  }

  /**
   * Wraps an insert that uses a generated sequential id. On a unique-constraint
   * violation (two concurrent requests generated the same id), the id is
   * regenerated and the insert retried a few times before giving up.
   */
  async insertWithGeneratedId<T>(
    generateId: () => Promise<string>,
    insert: (id: string) => Promise<T>,
    entityLabel: string,
  ): Promise<T> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const id = await generateId();
      try {
        return await insert(id);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue; // id collision -> regenerate and retry
        }
        throw err;
      }
    }
    throw new InternalServerErrorException(
      `Gagal membuat ${entityLabel}: ID bertabrakan berulang kali setelah ${MAX_ATTEMPTS} percobaan.`,
    );
  }

  private async listExistingIds(
    db: Prisma.TransactionClient | ProjectDatabase,
    model: SequencedModel,
  ): Promise<(string | null | undefined)[]> {
    switch (model) {
      case 'project': {
        const rows = await db.project.findMany({ select: { id: true } });
        return rows.map((r) => r.id);
      }
      case 'task': {
        const rows = await db.task.findMany({ select: { taskId: true } });
        return rows.map((r) => r.taskId);
      }
      case 'issue': {
        const rows = await db.issue.findMany({ select: { issueId: true } });
        return rows.map((r) => r.issueId);
      }
      case 'improvement': {
        const rows = await db.improvement.findMany({ select: { noteId: true } });
        return rows.map((r) => r.noteId);
      }
    }
  }
}
