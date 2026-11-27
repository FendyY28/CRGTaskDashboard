import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AddLogDto, UpdateLogDto } from './dto/project-payloads.dto';
import type { AuditLogger, IdGenerator, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';
import {
  cleanText,
  findTaskByName,
  normalizeTaskInput,
  parseTaskList,
  quoteNames,
  type TaskInput,
} from './project-text.utils';

/**
 * Weekly progress logs (the timeline) and the checklist tasks inside them.
 *
 * Owns the invariant that a project never accumulates duplicate task names —
 * both when a whole log is created and when a single task is toggled in.
 */
@Injectable()
export class WeeklyLogService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
    @Inject(PROJECT_ADAPTERS.ids) private readonly ids: IdGenerator,
  ) { }

  // -------------------------------------------------------------------------
  // Weekly logs
  // -------------------------------------------------------------------------

  async addLog(data: AddLogDto, userId: string) {
    const projectId = data.projectId;
    if (!projectId) throw new BadRequestException('Project tidak boleh kosong.');

    const project = await this.db.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new BadRequestException('Project tidak ditemukan.');

    const weekRange = cleanText(data.weekRange);
    if (!weekRange) throw new BadRequestException('Periode (week) tidak boleh kosong.');

    // Judul log mingguan wajib. Deskripsi tidak lagi di level log — deskripsi
    // melekat pada masing-masing task (lihat addTask).
    const title = cleanText(data.title);
    if (!title) throw new BadRequestException('Judul log tidak boleh kosong.');

    const taskList = parseTaskList(data.tasks);
    if (taskList.length === 0) {
      throw new BadRequestException('Tidak ada task yang valid untuk disimpan.');
    }

    // Deskripsi wajib diisi untuk setiap task — divalidasi di sini supaya tidak
    // ada task tersimpan dengan deskripsi kosong.
    const missingDescription = taskList.filter((t) => !t.description);
    if (missingDescription.length > 0) {
      throw new BadRequestException(
        `Deskripsi wajib diisi untuk setiap task. Belum diisi: ${quoteNames(
          missingDescription.map((t) => t.taskName),
        )}`,
      );
    }

    // Parent log + seluruh task dibuat dalam satu transaksi supaya kalau salah
    // satu task gagal, log setengah jadi tidak ikut tersimpan.
    const result = await this.db.$transaction(async (tx) => {
      await this.assertNoProjectWideDuplicates(tx, projectId, taskList);
      return this.persistLog(tx, projectId, weekRange, title, taskList);
    });

    await this.audit.log(
      userId,
      'ADD_WEEKLY_LOG',
      `Menambah Weekly Log "${title}" (${weekRange}, ${taskList.length} task)`,
      projectId,
    );
    return result;
  }

  /**
   * Reject tasks whose name already exists in another weekly log of the same
   * project, so the checklist cannot be duplicated across weeks.
   */
  private async assertNoProjectWideDuplicates(
    tx: Prisma.TransactionClient,
    projectId: string,
    taskList: TaskInput[],
  ) {
    const existingTasks = await tx.task.findMany({
      where: { weeklyProgress: { projectId } },
      select: { taskName: true },
    });
    const duplicateTasks = taskList.filter((t) => findTaskByName(existingTasks, t.taskName));
    if (duplicateTasks.length > 0) {
      throw new BadRequestException(
        `Task berikut sudah ada di weekly log project ini: ${quoteNames(
          duplicateTasks.map((t) => t.taskName),
        )}`,
      );
    }
  }

  /** Create the weekly log row and all of its tasks inside one transaction. */
  private async persistLog(
    tx: Prisma.TransactionClient,
    projectId: string,
    weekRange: string,
    title: string,
    taskList: TaskInput[],
  ) {
    const log = await tx.weeklyProgress.create({
      data: { projectId, weekRange, title, progress: 0, completed: 0, total: taskList.length },
    });

    for (const task of taskList) {
      // nextId() HARUS baca lewat `tx` — kalau baca lewat this.db, task yang
      // baru dibuat di transaksi ini belum terlihat, jadi semua task dalam satu
      // batch dapat nomor yang sama (ini penyebab checklist "doubling").
      const taskId = await this.ids.nextId('TSK', 'task', tx);
      await tx.task.create({
        data: {
          taskId,
          taskName: task.taskName,
          description: task.description,
          status: 'in-progress',
          completedDate: null,
          completedBy: null,
          weeklyProgressId: log.id,
        },
      });
    }

    const tasks = await tx.task.findMany({ where: { weeklyProgressId: log.id }, orderBy: { id: 'asc' } });
    return { ...log, tasks };
  }

  async updateLog(weeklyId: number, data: UpdateLogDto, userId: string) {
    // Hanya field yang benar-benar dikirim yang di-assign, supaya request
    // parsial tidak menulis undefined/NaN ke kolom lain.
    const payload: Prisma.WeeklyProgressUpdateInput = {};

    if (data.progress !== undefined && data.progress !== null) {
      payload.progress = clampPercent(data.progress);
    }
    if (data.weekRange !== undefined) {
      const weekRange = cleanText(data.weekRange);
      if (!weekRange) throw new BadRequestException('Periode (week) tidak boleh kosong.');
      payload.weekRange = weekRange;
    }
    if (data.title !== undefined) {
      const title = cleanText(data.title);
      if (!title) throw new BadRequestException('Judul log tidak boleh kosong.');
      payload.title = title;
    }
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('Tidak ada perubahan yang dikirim.');
    }

    const log = await this.db.weeklyProgress.update({ where: { id: Number(weeklyId) }, data: payload });
    await this.audit.log(
      userId,
      'UPDATE_WEEKLY_LOG',
      `Update Weekly Log "${log.title}" (ID ${weeklyId})`,
      log.projectId,
    );
    return log;
  }

  async removeLog(id: number, userId: string) {
    // Task di dalam log ikut terhapus karena Cascade Delete di schema.
    return this.support.deleteAndLog({
      load: () => this.db.weeklyProgress.findUnique({ where: { id: Number(id) } }),
      remove: () => this.db.weeklyProgress.delete({ where: { id: Number(id) } }),
      label: 'Log',
      userId,
      action: 'DELETE_WEEKLY_LOG',
      details: (log) => `Menghapus Weekly Log: ${log.weekRange}`,
      projectId: (log) => log.projectId,
    });
  }

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------

  async addTask(weeklyProgressId: number, taskName: string, userId: string, description?: string) {
    const normalized = normalizeTaskInput({ taskName, description });
    if (!normalized?.taskName) throw new BadRequestException('Nama task tidak boleh kosong');
    // Deskripsi wajib: menjelaskan pekerjaan dari task ini.
    if (!normalized.description) throw new BadRequestException('Deskripsi task tidak boleh kosong');

    const parent = await this.support.findOrThrow(
      () =>
        this.db.weeklyProgress.findUnique({
          where: { id: weeklyProgressId },
          include: { tasks: true },
        }),
      'Weekly Progress',
    );

    // Idempotency guard: kalau task dengan nama sama (case-insensitive) sudah ada
    // di weekly log ini, kembalikan yang lama alih-alih menambah baris kedua.
    // Ini yang bikin checklist "doubling" saat user double-click atau request retry.
    const duplicate = findTaskByName(parent.tasks, normalized.taskName);
    if (duplicate) return duplicate;

    const newTask = await this.ids.insertWithGeneratedId(
      () => this.ids.nextId('TSK', 'task'),
      (taskId) =>
        this.db.task.create({
          data: {
            taskId,
            taskName: normalized.taskName,
            description: normalized.description,
            status: 'in-progress',
            completedDate: null,
            completedBy: null,
            weeklyProgressId,
          },
        }),
      'task',
    );

    await this.support.recalcWeeklyProgress(weeklyProgressId);
    await this.audit.log(
      userId,
      'ADD_TASK',
      `Menambahkan tugas baru "${normalized.taskName}" (${newTask.taskId}) ke Weekly Log #${weeklyProgressId}`,
      parent.projectId,
    );
    return newTask;
  }

  async toggleTask(taskId: number, userId: string) {
    const task = await this.support.findOrThrow(
      () => this.db.task.findUnique({ where: { id: taskId }, include: { weeklyProgress: true } }),
      'Task',
    );

    const newStatus = task.status === 'completed' ? 'in-progress' : 'completed';
    // Atribusi "Dikerjakan Oleh" selalu berasal dari user terautentikasi,
    // tidak pernah dari input client (bisa dipalsukan).
    const actorName = await this.support.resolveUserName(userId);

    await this.db.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date() : null,
        completedBy: newStatus === 'completed' ? actorName : null,
      },
    });
    await this.support.recalcWeeklyProgress(task.weeklyProgressId);
    await this.audit.log(
      userId,
      'TOGGLE_TASK',
      `Mengubah status task ${task.taskName} menjadi ${newStatus}`,
      task.weeklyProgress?.projectId ?? undefined,
    );
    return { status: 'updated', newStatus };
  }

  async removeTask(taskId: number, userId: string) {
    await this.support.deleteAndLog({
      // Ambil info induknya sekaligus untuk audit log + recalc.
      load: () => this.db.task.findUnique({ where: { id: taskId }, include: { weeklyProgress: true } }),
      remove: () => this.db.task.delete({ where: { id: taskId } }),
      label: 'Task',
      userId,
      action: 'DELETE_TASK',
      details: (task) => `Menghapus Task: ${task.taskName}`,
      projectId: (task) => task.weeklyProgress?.projectId ?? undefined,
      // HITUNG ULANG PROGRESS INDUKNYA (Penting!)
      afterRemove: (task) => this.support.recalcWeeklyProgress(task.weeklyProgressId),
    });

    return { status: 'deleted', taskId };
  }
}

/** Keep a percentage inside 0..100; NaN falls back to 0 instead of reaching Prisma. */
const clampPercent = (value: number): number => Math.min(100, Math.max(0, Number(value) || 0));
