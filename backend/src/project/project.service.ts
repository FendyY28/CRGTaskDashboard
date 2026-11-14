import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import type { MasterPhase } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  AddLogDto,
  CreateImprovementDto,
  CreateIssueDto,
  CreateSitProcessDto,
  CreateTestCaseDto,
  ReplaceSitProcessesDto,
  UpdateIssueDto,
  UpdateLogDto,
  UpdateSitProcessDto,
  UpdateTestCaseDto,
} from './dto/project-payloads.dto';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  private readonly MASTER_PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];

  /** Max retries when a generated sequential id collides under concurrency. */
  private static readonly ID_COLLISION_RETRIES = 3;

  /**
   * Bentuk relasi project yang dipakai findAll(), findOne(), dan update().
   * Ditaruh di satu tempat supaya penambahan/penghapusan relasi cukup diubah
   * sekali dan response ketiga endpoint tidak pernah berbeda bentuk.
   */
  private static readonly PROJECT_INCLUDE = {
    sdlcPhases: {
      include: { notes: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ cycle: 'asc' }, { id: 'asc' }]
    },
    weeklyProgress: {
      include: { tasks: { orderBy: { id: 'asc' } } },
      orderBy: { id: 'desc' }
    },
    testCases: { include: { defect: true } },
    issues: { orderBy: { reportedDate: 'desc' } },
    improvements: { orderBy: { createdDate: 'desc' } }
  } satisfies Prisma.ProjectInclude;

  // Helper Auto Sequential Code: 001 -> 002 -> 003 ... 999 -> 1000, 1001
  private formatSeqId(prefix: string, num: number): string {
    if (num < 1000) {
      return `${prefix}-${num.toString().padStart(3, '0')}`;
    }
    return `${prefix}-${num}`;
  }

  /** Text a task name/description off the wire. */
  private static cleanTaskText(value: unknown): string {
    if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
    return '';
  }

  /**
   * Normalise one raw task payload (string or { taskName, description }) into
   * `{ taskName, description }`, or `null` when there is no usable name.
   */
  private static normalizeTaskInput(raw: unknown): { taskName: string; description: string } | null {
    const isRecord = typeof raw === 'object' && raw !== null;
    const rawName = isRecord ? (raw as { taskName?: unknown }).taskName : raw;
    const rawDesc = isRecord ? (raw as { description?: unknown }).description : '';
    const taskName = ProjectService.cleanTaskText(rawName);
    if (!taskName) return null;
    return { taskName, description: ProjectService.cleanTaskText(rawDesc) };
  }

  /** Return the first existing task whose name matches `taskName` (case-insensitive). */
  private static findTaskByName<T extends { taskName: string }>(
    existing: T[],
    taskName: string
  ): T | undefined {
    const key = taskName.toLowerCase();
    return existing.find((t) => t.taskName.toLowerCase() === key);
  }

  /** Resolve a display name from a user id or email ("Unknown User" as fallback). */
  private async resolveUserName(userId: string): Promise<string> {
    if (!userId) return "Unknown User";
    const user = await this.prisma.user.findFirst({ where: { OR: [{ id: userId }, { email: userId }] } });
    return user?.name ?? "Unknown User";
  }

  /** Recompute completed/total/progress on a weekly progress row from its tasks. */
  private async recalcWeeklyProgress(weeklyProgressId: number) {
    const parent = await this.prisma.weeklyProgress.findUnique({
      where: { id: weeklyProgressId },
      include: { tasks: true }
    });
    if (!parent) return;
    const total = parent.tasks.length;
    const completed = parent.tasks.filter(t => t.status === 'completed').length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await this.prisma.weeklyProgress.update({
      where: { id: weeklyProgressId },
      data: { total, completed, progress }
    });
  }

  /**
   * Wraps an insert that uses a generated sequential id. On a unique-constraint
   * violation (two concurrent requests generated the same id), the id is
   * regenerated and the insert retried a few times before giving up.
   */
  private async insertWithGeneratedId<T>(
    generateId: () => Promise<string>,
    insert: (id: string) => Promise<T>,
    entityLabel: string
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= ProjectService.ID_COLLISION_RETRIES; attempt++) {
      const id = await generateId();
      try {
        return await insert(id);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          lastError = err;
          continue; // id collision -> regenerate and retry
        }
        throw err;
      }
    }
    throw new InternalServerErrorException(
      `Gagal membuat ${entityLabel}: ID bertabrakan berulang kali setelah ${ProjectService.ID_COLLISION_RETRIES + 1} percobaan.`
    );
  }

  private async nextId(
    prefix: string,
    model: 'project' | 'task' | 'issue' | 'improvement',
    db: Prisma.TransactionClient | PrismaService = this.prisma
  ): Promise<string> {
    let idList: (string | null | undefined)[] = [];
    if (model === 'project') {
      const rows = await db.project.findMany({ select: { id: true } });
      idList = rows.map(r => r.id);
    } else if (model === 'task') {
      const rows = await db.task.findMany({ select: { taskId: true } });
      idList = rows.map(r => r.taskId);
    } else if (model === 'issue') {
      const rows = await db.issue.findMany({ select: { issueId: true } });
      idList = rows.map(r => r.issueId);
    } else if (model === 'improvement') {
      const rows = await db.improvement.findMany({ select: { noteId: true } });
      idList = rows.map(r => r.noteId);
    }

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
    return this.formatSeqId(prefix, maxNum + 1);
  }

  // 1. BASIC CRUD (FIND)
  async findAll() {
    return this.prisma.project.findMany({
      include: ProjectService.PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: ProjectService.PROJECT_INCLUDE
    });
  }

  // 2. CREATE PROJECT
  async create(data: CreateProjectDto, userId: string) {
    const initialPhase: MasterPhase = data.currentPhase || "Requirement";

    const newProject = await this.insertWithGeneratedId(
      () => this.nextId('PRJ', 'project'),
      (generatedId) =>
        this.prisma.project.create({
      data: {
        id: data.code || generatedId,
        name: data.name,
        pic: data.pic,
        currentPhase: initialPhase,
        status: data.status || "on-track",
        overallProgress: data.overallProgress ?? 0,
        projectStartDate: data.startDate ? new Date(data.startDate) : new Date(),
        projectDeadline: data.deadline ? new Date(data.deadline) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
        cycle: 1,
        sdlcPhases: {
          create: this.MASTER_PHASES.map((phaseName) => {
            const isCurrent = phaseName === initialPhase;
            return {
              phaseName: phaseName,
              cycle: 1,
              status: isCurrent ? 'in-progress' : 'pending',
              startDate: isCurrent ? (data.phaseStartDate ? new Date(data.phaseStartDate) : new Date()) : null,
              deadline: isCurrent ? (data.phaseDeadline ? new Date(data.phaseDeadline) : new Date(new Date().setDate(new Date().getDate() + 7))) : null
            };
          })
        }
      },
        }),
      'project'
    );
    // Audit log mencatat user
    await this.auditService.log(userId, "CREATE_PROJECT", `Membuat project baru: ${newProject.name}`, newProject.id);
    return newProject;
  }

  /**
   * Move the active cycle's SDLC phases to `targetPhase`: close the old phase,
   * then update or create the target phase row. Only touches the active cycle.
   */
  private async applyPhaseTransition(
    tx: Prisma.TransactionClient,
    id: string,
    oldProject: { currentPhase: string; cycle: number | null; status: string },
    targetPhase: string,
    requestData: UpdateProjectDto
  ) {
    const currentCycle = oldProject.cycle || 1;

    // Fase berubah. Selesaikan fase lama di cycle ini.
    const newStatusForOldPhase = oldProject.status === 'overdue' || oldProject.status === 'at-risk' ? oldProject.status : 'completed';

    await tx.sDLCPhase.updateMany({
      where: { projectId: id, phaseName: oldProject.currentPhase, cycle: currentCycle },
      data: { status: newStatusForOldPhase, progress: 100 } // Set progress 100 saat selesai
    });

    // Cari atau buat fase baru di cycle ini
    const targetPhaseRow = await tx.sDLCPhase.findFirst({ where: { projectId: id, phaseName: targetPhase, cycle: currentCycle } });
    const newStatus = requestData.phaseStatus || requestData.status || 'on-track';
    const newStartDate = requestData.phaseStartDate ? new Date(requestData.phaseStartDate) : new Date();
    const newDeadline = requestData.phaseDeadline ? new Date(requestData.phaseDeadline) : undefined;

    if (targetPhaseRow) {
      await tx.sDLCPhase.update({
        where: { id: targetPhaseRow.id },
        data: { status: newStatus, startDate: newStartDate, deadline: newDeadline }
      });
    } else {
      await tx.sDLCPhase.create({
        data: {
          status: newStatus,
          startDate: newStartDate,
          deadline: newDeadline,
          project: { connect: { id } },
          phaseName: targetPhase,
          cycle: currentCycle
        }
      });
    }
  }

  /** Update detail fase aktif tanpa pindah fase (progress/deadline/status). */
  private async updateActivePhaseDetail(
    tx: Prisma.TransactionClient,
    id: string,
    targetPhase: string,
    currentCycle: number,
    requestData: UpdateProjectDto
  ) {
    const phaseUpdatePayload: Prisma.SDLCPhaseUpdateManyMutationInput = {};
    if (requestData.phaseDeadline) phaseUpdatePayload.deadline = new Date(requestData.phaseDeadline);
    if (requestData.phaseStartDate) phaseUpdatePayload.startDate = new Date(requestData.phaseStartDate);
    if (requestData.phaseStatus) phaseUpdatePayload.status = requestData.phaseStatus;
    if (requestData.overallProgress !== undefined) {
      phaseUpdatePayload.progress = requestData.overallProgress;
    }

    if (Object.keys(phaseUpdatePayload).length > 0) {
      await tx.sDLCPhase.updateMany({ where: { projectId: id, phaseName: targetPhase, cycle: currentCycle }, data: phaseUpdatePayload });
    }
  }

  /**
   * Map the request onto the project columns, assigning only fields that were
   * actually sent so partial requests never write undefined/NaN to other columns.
   */
  private buildProjectUpdate(requestData: UpdateProjectDto, targetPhase: string): Prisma.ProjectUpdateInput {
    const projectUpdateData: Prisma.ProjectUpdateInput = { currentPhase: targetPhase };
    if (requestData.name !== undefined) projectUpdateData.name = requestData.name;
    if (requestData.pic !== undefined) projectUpdateData.pic = requestData.pic;
    if (requestData.status !== undefined) projectUpdateData.status = requestData.status;
    if (requestData.overallProgress !== undefined) {
      projectUpdateData.overallProgress = requestData.overallProgress;
    }
    if (requestData.projectStartDate) projectUpdateData.projectStartDate = new Date(requestData.projectStartDate);
    if (requestData.projectDeadline) projectUpdateData.projectDeadline = new Date(requestData.projectDeadline);
    return projectUpdateData;
  }

  // 3. UPDATE PROJECT
  async update(id: string, requestData: UpdateProjectDto, userId: string) {
    const oldProject = await this.prisma.project.findUnique({ where: { id }, include: { sdlcPhases: true } });
    if (!oldProject) throw new NotFoundException("Project not found");

    // Fall back to the project's current phase when the caller omits it, and
    // reject the request outright if it cannot be resolved to a known phase.
    const targetPhase: string = requestData.currentPhase ?? oldProject.currentPhase;
    if (!targetPhase || !this.MASTER_PHASES.includes(targetPhase)) {
      throw new BadRequestException(`Fase project tidak valid: ${targetPhase ?? '(kosong)'}`);
    }

    const isPhaseChanged = requestData.currentPhase && (requestData.currentPhase !== oldProject.currentPhase);
    const currentCycle = oldProject.cycle || 1; // PENTING: Hanya modifikasi cycle aktif

    const updatedProject = await this.prisma.$transaction(async (tx) => {
      if (isPhaseChanged) {
        await this.applyPhaseTransition(tx, id, oldProject, targetPhase, requestData);
      } else {
        await this.updateActivePhaseDetail(tx, id, targetPhase, currentCycle, requestData);
      }

      // Bentuk response disamakan dengan findOne() supaya konsumen tidak
      // kehilangan field (tasks, testCases, issues, improvements) setelah update.
      return tx.project.update({
        where: { id },
        data: this.buildProjectUpdate(requestData, targetPhase),
        include: ProjectService.PROJECT_INCLUDE
      });
    });

    if (!updatedProject) throw new Error("Gagal mengupdate project.");

    let action = "UPDATE_PROJECT";
    let detail = `Update detail project ${updatedProject.name}`;

    if (isPhaseChanged) {
        action = "CHANGE_PHASE";
        detail = `Project ${updatedProject.name} pindah fase ke ${requestData.currentPhase}`;
    } else if (requestData.status && requestData.status !== oldProject.status) {
        action = "UPDATE_STATUS";
        detail = `Ubah status project ${updatedProject.name} menjadi ${requestData.status}`;
    }

    await this.auditService.log(userId, action, detail, id);
    return updatedProject;
  }

  // 4. DELETE PROJECT
  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id }});
    if (!project) throw new NotFoundException("Project not found");

    const deleted = await this.prisma.project.delete({ where: { id } });
    await this.auditService.log(userId, "DELETE_PROJECT", `Menghapus project: ${project.name}`, id);
    return deleted;
  }

  // 5. ISSUES & IMPROVEMENTS
  async findAllIssues() {
    return this.prisma.issue.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { reportedDate: 'desc' }
    });
  }

  async createIssue(data: CreateIssueDto, userId: string) {
    const issue = await this.insertWithGeneratedId(
      () => (data.issueId && !data.issueId.startsWith('ISS-'))
        ? Promise.resolve(data.issueId)
        : this.nextId('ISS', 'issue'),
      (issueId) =>
        this.prisma.issue.create({
          data: {
            issueId: issueId, title: data.title, priority: data.priority, description: data.description,
            impactArea: data.impactArea || "General", reportedBy: data.reportedBy || "System", status: "open", projectId: data.projectId
          }
        }),
      'issue'
    );
    await this.auditService.log(userId, "CREATE_ISSUE", `Report Issue baru: ${data.title} (${issue.issueId})`, data.projectId);
    return issue;
  }

  async updateIssue(id: number, data: UpdateIssueDto, userId: string) {
    const issue = await this.prisma.issue.update({
      where: { id: Number(id) },
      data: { status: data.status }
    });
    await this.auditService.log(userId, "UPDATE_ISSUE", `Update status Issue ${issue.issueId} menjadi ${data.status}`, issue.projectId);
    return issue;
  }

  async removeIssue(id: number, userId: string) {
    const issue = await this.prisma.issue.findUnique({ where: { id: Number(id) } });

    if (!issue) {
      throw new NotFoundException("Issue not found");
    }

    await this.prisma.issue.delete({ where: { id: Number(id) } });
    await this.auditService.log(userId, "DELETE_ISSUE", `Menghapus Issue: ${issue.title}`, issue.projectId);
    return issue;
  }

  async createImprovement(data: CreateImprovementDto, userId: string) {
    // noteId selalu digenerate agar format konsisten (IMP-xxx) — client tidak
    // bisa lagi menentukan sendiri ID-nya lewat body.
    const imp = await this.insertWithGeneratedId(
      () => this.nextId('IMP', 'improvement'),
      (noteId) =>
        this.prisma.improvement.create({
          data: {
            noteId: noteId,
            title: data.title || "Optimization Idea",
            // Kolom ini wajib di DB, jadi beri default aman kalau form tidak mengisi.
            reviewer: data.reviewer || "Unknown User",
            developer: data.developer || "Unknown User",

            feedback: data.feedback || "",

            recommendations: data.recommendations || "",
            priority: data.priority || "medium",
            projectId: data.projectId
          }
        }),
      'improvement'
    );
    await this.auditService.log(userId, "ADD_IMPROVEMENT", `Menambah catatan improvement untuk project (${imp.noteId})`, data.projectId);
    return imp;
  }

  async removeImprovement(id: number, userId: string) {
    // Cari data aslinya dulu sebelum dihapus (agar kita tahu apa yang dihapus)
    const imp = await this.prisma.improvement.findUnique({
      where: { id: Number(id) }
    });

    if (!imp) {
      throw new NotFoundException("Improvement not found");
    }

    // Hapus datanya dari database
    const deletedImp = await this.prisma.improvement.delete({
      where: { id: Number(id) }
    });

    // CATAT KE ACTIVITY LOG (AUDIT LOG)
    await this.auditService.log(
      userId,
      "DELETE_IMPROVEMENT",
      `Menghapus Ide Optimalisasi: ${imp.title}`,
      imp.projectId
    );

    return deletedImp;
  }

  // 6. WEEKLY PROGRESS (TIMELINE)

  /**
   * Normalise the raw task payload: trim/compact text, drop nameless rows and
   * dedup case-insensitively. Tasks may arrive as a plain string or as
   * { taskName, description } so the per-task description is preserved.
   */
  private parseTaskList(rawTasks: unknown): { taskName: string; description: string }[] {
    const list = Array.isArray(rawTasks) ? rawTasks : [rawTasks];
    const seen = new Set<string>();
    const tasks: { taskName: string; description: string }[] = [];

    for (const raw of list) {
      const task = ProjectService.normalizeTaskInput(raw);
      if (!task) continue;
      const key = task.taskName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tasks.push(task);
    }

    return tasks;
  }

  /** Create the weekly log row and all of its tasks inside one transaction. */
  private async persistLog(
    tx: Prisma.TransactionClient,
    projectId: string,
    weekRange: string,
    title: string,
    taskList: { taskName: string; description: string }[]
  ) {
    const log = await tx.weeklyProgress.create({
      data: {
        projectId,
        weekRange,
        title,
        progress: 0,
        completed: 0,
        total: taskList.length,
      },
    });

    for (const task of taskList) {
      // nextId() HARUS baca lewat `tx` — kalau baca lewat this.prisma, task yang
      // baru dibuat di transaksi ini belum terlihat, jadi semua task dalam satu
      // batch dapat nomor yang sama (ini penyebab checklist "doubling").
      const taskId = await this.nextId('TSK', 'task', tx);
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

  async addLog(data: AddLogDto, userId: string) {
    const projectId: string = data.projectId;
    if (!projectId) throw new BadRequestException("Project tidak boleh kosong.");

    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundException("Project not found");

    const weekRange: string = (data.weekRange || "").trim();
    if (!weekRange) throw new BadRequestException("Periode (week) tidak boleh kosong.");

    // Judul log mingguan wajib. Deskripsi tidak lagi di level log — deskripsi
    // melekat pada masing-masing task (lihat addTask).
    const title: string = String(data.title ?? "").replace(/\s+/g, " ").trim();
    if (!title) throw new BadRequestException("Judul log tidak boleh kosong.");

    const rawTasks: unknown = data.tasks;
    const taskList = this.parseTaskList(rawTasks);

    if (taskList.length === 0) throw new BadRequestException("Tidak ada task yang valid untuk disimpan.");

    // Deskripsi wajib diisi untuk setiap task — divalidasi di sini supaya tidak
    // ada task tersimpan dengan deskripsi kosong.
    const missingDescription = taskList.filter(t => !t.description);
    if (missingDescription.length > 0) {
      throw new BadRequestException(
        `Deskripsi wajib diisi untuk setiap task. Belum diisi: ${missingDescription.map(t => `"${t.taskName}"`).join(', ')}`
      );
    }

    // Parent log + seluruh task dibuat dalam satu transaksi supaya kalau salah
    // satu task gagal, log setengah jadi tidak ikut tersimpan.
    const result = await this.prisma.$transaction(async (tx) => {
      // Tolak task yang namanya sudah ada di weekly log lain pada project ini,
      // supaya checklist tidak terduplikasi antar-minggu (guard yang sama dengan
      // addTask, hanya saja scope-nya seluruh project).
      const existingTasks = await tx.task.findMany({
        where: { weeklyProgress: { projectId } },
        select: { taskName: true },
      });
      const duplicateTasks = taskList.filter((t) => ProjectService.findTaskByName(existingTasks, t.taskName));
      if (duplicateTasks.length > 0) {
        throw new BadRequestException(
          `Task berikut sudah ada di weekly log project ini: ${duplicateTasks.map(t => `"${t.taskName}"`).join(', ')}`
        );
      }

      return this.persistLog(tx, projectId, weekRange, title, taskList);
    });

    await this.auditService.log(
      userId,
      "ADD_WEEKLY_LOG",
      `Menambah Weekly Log "${title}" (${weekRange}, ${taskList.length} task)`,
      projectId
    );
    return result;
  }

  async removeLog(id: number, userId: string) {
    // Cari data dulu untuk keperluan Log Audit (Opsional tapi bagus)
    const log = await this.prisma.weeklyProgress.findUnique({
        where: { id: Number(id) }
    });

    if (!log) throw new NotFoundException("Log not found");

    // Hapus data (Task di dalamnya otomatis terhapus karena Cascade Delete di Schema)
    const deleted = await this.prisma.weeklyProgress.delete({
        where: { id: Number(id) }
    });

    // Catat siapa yang menghapus
    await this.auditService.log(userId, "DELETE_WEEKLY_LOG", `Menghapus Weekly Log: ${log.weekRange}`, log.projectId);

    return deleted;
  }

  async updateLog(weeklyId: number, data: UpdateLogDto, userId: string) {
      // Hanya field yang benar-benar dikirim yang di-assign, supaya request
      // parsial tidak menulis undefined/NaN ke kolom lain (mis. `progress`
      // yang tidak ikut terkirim menghasilkan NaN kalau langsung di-parseInt).
      const payload: Prisma.WeeklyProgressUpdateInput = {};

      if (data.progress !== undefined && data.progress !== null) {
        payload.progress = Math.min(100, Math.max(0, data.progress));
      }

      if (data.weekRange !== undefined) {
        const weekRange = String(data.weekRange).trim();
        if (!weekRange) throw new BadRequestException("Periode (week) tidak boleh kosong.");
        payload.weekRange = weekRange;
      }

      if (data.title !== undefined) {
        const title = String(data.title).replace(/\s+/g, ' ').trim();
        if (!title) throw new BadRequestException("Judul log tidak boleh kosong.");
        payload.title = title;
      }

      if (Object.keys(payload).length === 0) {
        throw new BadRequestException("Tidak ada perubahan yang dikirim.");
      }

      const log = await this.prisma.weeklyProgress.update({ where: { id: Number(weeklyId) }, data: payload });
      await this.auditService.log(userId, "UPDATE_WEEKLY_LOG", `Update Weekly Log "${log.title}" (ID ${weeklyId})`, log.projectId);
      return log;
  }


  async addTask(weeklyProgressId: number, taskName: string, userId: string, description?: string) {
    const normalized = ProjectService.normalizeTaskInput({ taskName, description });
    const normalizedName = normalized?.taskName ?? "";
    if (!normalizedName) {
      throw new BadRequestException("Nama task tidak boleh kosong");
    }

    // Deskripsi wajib diisi: menjelaskan pekerjaan dari task ini.
    const normalizedDescription = normalized?.description ?? "";
    if (!normalizedDescription) {
      throw new BadRequestException("Deskripsi task tidak boleh kosong");
    }

    const parent = await this.prisma.weeklyProgress.findUnique({
      where: { id: weeklyProgressId },
      include: { tasks: true }
    });

    if (!parent) {
      throw new NotFoundException("Weekly Progress not found");
    }

    // Idempotency guard: kalau task dengan nama sama (case-insensitive) sudah ada
    // di weekly log ini, kembalikan yang lama alih-alih menambah baris kedua.
    // Ini yang bikin checklist "doubling" saat user double-click atau request retry
    // (kombinasi taskId @unique + insertWithGeneratedId hanya menangkap tabrakan ID,
    // bukan insert kedua dari user yang sama).
    const duplicate = ProjectService.findTaskByName(parent.tasks, normalizedName);
    if (duplicate) {
      return duplicate;
    }

    // Auto-generate sequential TSK ID
    const newTask = await this.insertWithGeneratedId(
      () => this.nextId('TSK', 'task'),
      (taskId) =>
        this.prisma.task.create({
          data: {
            taskId,
            taskName: normalizedName,
            description: normalizedDescription,
            status: 'in-progress',
            completedDate: null,
            completedBy: null,
            weeklyProgressId: weeklyProgressId
          }
        }),
      'task'
    );

    // Recalculate parent progress & total
    await this.recalcWeeklyProgress(weeklyProgressId);

    await this.auditService.log(
      userId,
      "ADD_TASK",
      `Menambahkan tugas baru "${normalizedName}" (${newTask.taskId}) ke Weekly Log #${weeklyProgressId}`,
      parent.projectId
    );

    return newTask;
  }

  async toggleTask(taskId: number, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { weeklyProgress: true } });
    if (!task) throw new NotFoundException("Task not found");
    const newStatus = task.status === 'completed' ? 'in-progress' : 'completed';
    // Atribusi "Dikerjakan Oleh" selalu berasal dari user terautentikasi,
    // tidak pernah dari input client (bisa dipalsukan).
    const actorName = await this.resolveUserName(userId);
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedDate: newStatus === 'completed' ? new Date() : null,
        completedBy: newStatus === 'completed' ? actorName : null
      }
    });
    await this.recalcWeeklyProgress(task.weeklyProgressId);
    await this.auditService.log(userId, "TOGGLE_TASK", `Mengubah status task ${task.taskName} menjadi ${newStatus}`, task.weeklyProgress?.projectId ?? undefined);
    return { status: "updated", newStatus };
  }

  async removeTask(taskId: number, userId: string) {
    // Cari Task & Parentnya dulu (sebelum dihapus)
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { weeklyProgress: true } // Ambil info induknya
    });

    if (!task) throw new NotFoundException("Task not found");

    // Hapus Task
    await this.prisma.task.delete({ where: { id: taskId } });

    // HITUNG ULANG PROGRESS INDUKNYA (Penting!)
    await this.recalcWeeklyProgress(task.weeklyProgressId);

    // 4. Audit Log
    await this.auditService.log(userId, "DELETE_TASK", `Menghapus Task: ${task.taskName}`, task.weeklyProgress?.projectId ?? undefined);

    return { status: "deleted", taskId };
  }

  // ==========================================================
  // 7. TESTING (TEST CASES & DEFECTS) - UPDATED
  // ==========================================================
  async getTestingStatus() { return this.prisma.project.findMany({ select: { id: true, name: true, currentPhase: true, testCases: { include: { defect: true } } } }); }
  async getTestCases(projectId: string) { return this.prisma.testCase.findMany({ where: { projectId }, include: { defect: true }, orderBy: { createdAt: 'desc' } }); }

  // ==========================================================
  // 8. SIT PROCESS PIPELINE
  // Semua perubahan status dicatat ke Audit Log agar jejak
  // eksekusi SIT ikut tampil di halaman Audit Trail.
  // ==========================================================

  async getSitProcesses(projectId: string) {
    return this.prisma.sitProcess.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  async createSitProcess(data: CreateSitProcessDto, userId: string) {
    if (!data.key && !data.name?.trim()) {
      throw new BadRequestException('Nama proses dinamis wajib diisi.');
    }

    const actorName = await this.resolveUserName(userId);
    const id = data.key ? `fixed:${data.key}` : `dyn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const displayName = data.key ? data.key : data.name!.trim();

    const process = await this.prisma.sitProcess.create({
      data: {
        id,
        key: data.key || null,
        name: displayName,
        status: data.status,
        order: data.order,
        createdBy: actorName,
        updatedBy: actorName,
        projectId: data.projectId,
      },
    });

    await this.auditService.log(
      userId,
      "ADD_SIT_PROCESS",
      `Menambahkan proses SIT "${displayName}"`,
      data.projectId,
    );
    return process;
  }

  async updateSitProcess(id: string, data: UpdateSitProcessDto, projectId: string, userId: string) {
    const actorName = await this.resolveUserName(userId);
    const existing = await this.prisma.sitProcess.findFirst({ where: { id, projectId } });
    if (!existing) throw new NotFoundException('Proses SIT tidak ditemukan.');

    const process = await this.prisma.sitProcess.update({
      where: { id },
      data: { status: data.status, updatedBy: actorName },
    });

    await this.auditService.log(
      userId,
      "UPDATE_SIT_PROCESS",
      `Proses SIT "${existing.name}" -> ${data.status}`,
      projectId,
    );
    return process;
  }

  async deleteSitProcess(id: string, projectId: string, userId: string) {
    const existing = await this.prisma.sitProcess.findFirst({ where: { id, projectId } });
    if (!existing) throw new NotFoundException('Proses SIT tidak ditemukan.');
    if (existing.key) {
      throw new BadRequestException('Proses standar tidak dapat dihapus.');
    }

    await this.prisma.sitProcess.delete({ where: { id } });
    await this.auditService.log(
      userId,
      "DELETE_SIT_PROCESS",
      `Menghapus proses SIT "${existing.name}"`,
      projectId,
    );
    return { status: 'deleted' };
  }

  /**
   * Full-state sync used when the user (de)selects statuses or reorders the
   * pipeline locally: replaces the stored set with what the client holds and
   * writes ONE audit entry summarising every status transition.
   */
  async replaceSitProcesses(data: ReplaceSitProcessesDto, userId: string) {
    const actorName = await this.resolveUserName(userId);
    const projectId = data.projectId;

    const previous = await this.prisma.sitProcess.findMany({ where: { projectId } });
    const prevStatusById = new Map(previous.map((p) => [p.id, p.status]));

    await this.prisma.$transaction([
      this.prisma.sitProcess.deleteMany({ where: { projectId } }),
      this.prisma.sitProcess.createMany({
        data: data.processes.map((p) => ({
          id: p.id,
          key: p.key || null,
          name: p.name,
          status: p.status,
          order: p.order,
          createdBy: actorName,
          updatedBy: prevStatusById.get(p.id) !== p.status ? actorName : undefined,
          projectId,
        })),
      }),
    ]);

    const transitions = data.processes
      .filter((p) => prevStatusById.get(p.id) !== undefined && prevStatusById.get(p.id) !== p.status)
      .map((p) => `"${p.name}" ${prevStatusById.get(p.id)} -> ${p.status}`);
    const added = data.processes.filter((p) => !prevStatusById.has(p.id)).map((p) => `"${p.name}"`);
    const removed = previous.filter((p) => !data.processes.some((n) => n.id === p.id)).map((p) => `"${p.name}"`);

    const parts: string[] = [];
    if (added.length) parts.push(`Menambahkan proses SIT: ${added.join(', ')}`);
    if (removed.length) parts.push(`Menghapus proses SIT: ${removed.join(', ')}`);
    if (transitions.length) parts.push(`Update proses SIT: ${transitions.join('; ')}`);
    if (parts.length) {
      await this.auditService.log(userId, "UPDATE_SIT_PROCESS", parts.join(' | '), projectId);
    }

    return this.getSitProcesses(projectId);
  }

  // CREATE dengan pencarian User yang lebih standar
  async createTestCase(data: CreateTestCaseDto, userId: string) {
      const userName = await this.resolveUserName(userId);

      const tc = await this.prisma.testCase.create({
        data: {
          projectId: data.projectId,
          title: data.title,
          type: data.type,
          notes: data.notes,
          status: 'pending',
          updatedBy: userName // Set pembuat sebagai updater pertama
        }
      });
      await this.auditService.log(userId, "CREATE_TEST_CASE", `Membuat Test Case: ${data.title}`, data.projectId);
      return tc;
  }

  // UPDATE dengan pencarian User yang lebih standar
  async updateTestCase(id: string, data: UpdateTestCaseDto, userId: string) {
    const { status, notes, defect, takeoutReason, isDeleted } = data;

    const userName = await this.resolveUserName(userId);

    // Test case dan defect-nya diubah dalam satu transaksi supaya tidak pernah
    // ada status 'fail' tanpa defect (atau defect basi) kalau salah satu gagal.
    const tc = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.testCase.update({
        where: { id },
        data: {
          status,
          notes,
          takeoutReason,
          isDeleted,
          updatedBy: userName
        }
      });

      if (status === 'fail' && defect) {
          await tx.defect.upsert({
              where: { testCaseId: id },
              update: { description: defect.description, severity: defect.severity, status: 'open' },
              create: { testCaseId: id, description: defect.description, severity: defect.severity, status: 'open' }
          });
      } else if (status === 'pass' || status === 'pending') {
          await tx.defect.deleteMany({ where: { testCaseId: id } });
      }

      return updated;
    });

    await this.auditService.log(userId, "UPDATE_TEST_CASE", `Update status Test Case menjadi ${status}`, tc.projectId);
    return tc;
  }

  async deleteTestCase(id: string, userId: string) {
      // Catat pelaku
      const userName = await this.resolveUserName(userId);

      // SOFT DELETE (Update status, bukan hapus data)
      const tc = await this.prisma.testCase.update({
          where: { id },
          data: {
              isDeleted: true,       // Tandai terhapus
              deletedBy: userName,   // Catat pelaku
              deletedAt: new Date()  // Catat waktu
          }
      });

      // Catat ke Audit Log Activity
      await this.auditService.log(
          userId,
          "TAKEOUT_TEST_CASE",
          `Melakukan Takeout pada Test Case: "${tc.title}"`,
          tc.projectId
      );

      return tc;
  }

  // 6. NEXT CYCLE MANAGEMENT (SMART AUTOMATION)

  /** Lock the active cycle: freeze the active phase and close everything up to it. */
  private async closeActiveCycle(
    tx: Prisma.TransactionClient,
    id: string,
    oldProject: { currentPhase: string; overallProgress: number | null; status: string | null },
    currentCycle: number
  ) {
    const currentActivePhase = oldProject.currentPhase;

    // Simpan progress & status aktual dari fase aktif di cycle lama
    await tx.sDLCPhase.updateMany({
      where: { projectId: id, cycle: currentCycle, phaseName: currentActivePhase },
      data: {
        progress: oldProject.overallProgress || 0,
        status: oldProject.status || 'completed'
      }
    });

    // Kunci semua fase yang dilewati sebelum fase aktif di cycle lama menjadi completed
    const curPhaseIdx = this.MASTER_PHASES.indexOf(currentActivePhase);
    if (curPhaseIdx !== -1) {
      for (let i = 0; i < curPhaseIdx; i++) {
        await tx.sDLCPhase.updateMany({
          where: { projectId: id, cycle: currentCycle, phaseName: this.MASTER_PHASES[i] },
          data: { status: 'completed', progress: 100 }
        });
      }
    }

    // Kunci semua fase yang masih in-progress di cycle lama menjadi completed
    await tx.sDLCPhase.updateMany({
      where: { projectId: id, cycle: currentCycle, status: 'in-progress' },
      data: { status: 'completed', progress: 100 }
    });
  }

  /** Create the fresh set of master phases for a newly started cycle. */
  private async createCyclePhases(
    tx: Prisma.TransactionClient,
    id: string,
    initialPhase: string,
    cycle: number,
    dates: { start: Date; deadline: Date }
  ) {
    for (const phaseName of this.MASTER_PHASES) {
      const isInitial = phaseName === initialPhase;
      await tx.sDLCPhase.create({
        data: {
          projectId: id,
          phaseName,
          cycle,
          status: isInitial ? 'on-track' : 'pending',
          progress: 0, // Reset progress per fase
          startDate: isInitial ? dates.start : null,
          deadline: isInitial ? dates.deadline : null
        }
      });
    }
  }

  async nextCycle(id: string, userId: string, body?: { targetPhase?: string }) {
    const oldProject = await this.prisma.project.findUnique({
        where: { id },
        include: { sdlcPhases: true }
    });

    if (!oldProject) throw new NotFoundException("Project not found");

    const currentCycle = oldProject.cycle || 1;
    const nextCycle = currentCycle + 1;

    // Tentukan fase awal untuk cycle baru (Default: Requirement, atau sesuai permintaan Frontend)
    const initialPhaseForNewCycle = body?.targetPhase || 'Requirement';

    // Smart Automation Dates
    const today = new Date();

    // Deadline Project: 1 Bulan ke depan
    const newGlobalDeadline = new Date(today);
    newGlobalDeadline.setMonth(newGlobalDeadline.getMonth() + 1);

    // Deadline Fase Pertama (Bisa Requirement, bisa TF Meeting, dll): 1 Minggu ke depan
    const newPhaseDeadline = new Date(today);
    newPhaseDeadline.setDate(newPhaseDeadline.getDate() + 7);

    const updatedProject = await this.prisma.$transaction(async (tx) => {
        // 1. Kunci cycle lama: fase aktif disimpan, fase sebelumnya ditutup.
        await this.closeActiveCycle(tx, id, oldProject, currentCycle);

        // 2. UPDATE PROJECT KE CYCLE BARU & RESET PROGRESS
        await tx.project.update({
            where: { id },
            data: {
                cycle: nextCycle,
                overallProgress: 0,
                currentPhase: initialPhaseForNewCycle,
                status: 'on-track',
                projectStartDate: today,
                projectDeadline: newGlobalDeadline
            }
        });

        // 3. GENERATE 6 FASE BARU UNTUK CYCLE BARU
        await this.createCyclePhases(tx, id, initialPhaseForNewCycle, nextCycle, {
            start: today,
            deadline: newPhaseDeadline
        });

        return tx.project.findUnique({
            where: { id },
            include: { sdlcPhases: true }
        });
    });

    if (!updatedProject) throw new Error("Gagal memuat data project setelah cycle baru.");

    await this.auditService.log(userId, "NEXT_CYCLE", `Project ${updatedProject.name} dinaikkan ke Cycle ${nextCycle} mulai di fase ${initialPhaseForNewCycle}`, updatedProject.id);
    return updatedProject;
  }

  // 7. PHASE NOTES (Catatan Progres per Fase SDLC)
  async addPhaseNote(phaseId: number, content: string, userId: string) {
    const trimmedContent = (content ?? '').trim();
    if (!trimmedContent) {
      throw new BadRequestException("Isi catatan tidak boleh kosong.");
    }

    // Validasi fase dulu supaya tidak ada catatan orphan untuk phaseId palsu.
    const phase = await this.prisma.sDLCPhase.findUnique({ where: { id: phaseId }, include: { project: true } });
    if (!phase) throw new NotFoundException("Fase tidak ditemukan");

    const createdBy = await this.resolveUserName(userId);

    const note = await this.prisma.phaseNote.create({
      data: { phaseId, content: trimmedContent, createdBy }
    });

    // Catat ke activity log
    await this.auditService.log(userId, "ADD_PHASE_NOTE", `Menambahkan catatan ke fase ${phase.phaseName} (Cycle ${phase.cycle}) pada project ${phase.project.name}`, phase.projectId);

    return note;
  }

  async getPhaseNotes(phaseId: number) {
    return this.prisma.phaseNote.findMany({
      where: { phaseId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async deletePhaseNote(noteId: number, userId: string) {
    const note = await this.prisma.phaseNote.findUnique({ where: { id: noteId }, include: { phase: { include: { project: true } } } });
    if (!note) throw new NotFoundException("Catatan tidak ditemukan");

    await this.prisma.phaseNote.delete({ where: { id: noteId } });

    if (note.phase) {
      await this.auditService.log(userId, "DELETE_PHASE_NOTE", `Menghapus catatan dari fase ${note.phase.phaseName} pada project ${note.phase.project.name}`, note.phase.projectId);
    }

    return { success: true };
  }
}
