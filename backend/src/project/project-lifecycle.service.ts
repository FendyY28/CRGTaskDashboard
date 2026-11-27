import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateProjectDto, type MasterPhase } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import {
  DEFAULT_PHASE,
  PHASE_SEQUENCE,
  PROJECT_INCLUDE,
} from './project.constants';
import type { AuditLogger, IdGenerator, ProjectDatabase } from './project.interfaces';
import { PROJECT_ADAPTERS } from './project.tokens';
import type { ProjectSupportService } from './project-support.service';

/**
 * Project lifecycle: create / read / update (including phase transitions) /
 * delete, plus the SDLC cycle rollover.
 *
 * Phase and cycle bookkeeping lives behind small private helpers so `update()`
 * and `nextCycle()` read as the story of what happens, not as Prisma queries.
 */
@Injectable()
export class ProjectLifecycleService {
  constructor(
    @Inject(PROJECT_ADAPTERS.database) private readonly db: ProjectDatabase,
    @Inject(PROJECT_ADAPTERS.audit) private readonly audit: AuditLogger,
    @Inject(PROJECT_ADAPTERS.support) private readonly support: ProjectSupportService,
    @Inject(PROJECT_ADAPTERS.ids) private readonly ids: IdGenerator,
  ) { }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async findAll() {
    return this.db.project.findMany({
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.db.project.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
  }

  // -------------------------------------------------------------------------
  // Create
  // -------------------------------------------------------------------------

  async create(data: CreateProjectDto, userId: string) {
    const initialPhase: MasterPhase = data.currentPhase || DEFAULT_PHASE;
    const projectData: Omit<Prisma.ProjectCreateInput, 'id'> = {
      name: data.name,
      pic: data.pic,
      currentPhase: initialPhase,
      status: data.status || 'on-track',
      overallProgress: data.overallProgress ?? 0,
      projectStartDate: data.startDate ? new Date(data.startDate) : new Date(),
      projectDeadline: data.deadline
        ? new Date(data.deadline)
        : defaultDeadlineInOneMonth(),
      cycle: 1,
      sdlcPhases: {
        create: this.buildInitialPhases(initialPhase, data),
      },
    };

    // A client-supplied `code` is a user decision, not a generated id: a unique
    // violation there is "already taken", not a collision worth retrying.
    const newProject = data.code
      ? await this.createProjectWithCode(data.code, projectData)
      : await this.ids.insertWithGeneratedId(
        () => this.ids.nextId('PRJ', 'project'),
        (generatedId) => this.db.project.create({ data: { ...projectData, id: generatedId } }),
        'project',
      );

    await this.audit.log(
      userId,
      'CREATE_PROJECT',
      `Membuat project baru: ${newProject.name}`,
      newProject.id,
    );
    return newProject;
  }

  /** One SDLC row per master phase; only the starting phase is active. */
  private buildInitialPhases(
    initialPhase: MasterPhase,
    data: CreateProjectDto,
  ): Prisma.SDLCPhaseCreateWithoutProjectInput[] {
    return PHASE_SEQUENCE.map((phaseName) => {
      const isCurrent = phaseName === initialPhase;
      return {
        phaseName,
        cycle: 1,
        status: isCurrent ? 'in-progress' : 'pending',
        startDate: isCurrent ? (data.phaseStartDate ? new Date(data.phaseStartDate) : new Date()) : null,
        deadline: isCurrent
          ? (data.phaseDeadline ? new Date(data.phaseDeadline) : defaultDeadlineInOneWeek())
          : null,
      };
    });
  }

  /** Insert a project under an explicit client-supplied code, mapping duplicate codes to 409. */
  private async createProjectWithCode(code: string, data: Omit<Prisma.ProjectCreateInput, 'id'>) {
    try {
      return await this.db.project.create({ data: { ...data, id: code } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`Kode project "${code}" sudah dipakai. Gunakan kode lain.`);
      }
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // Update (incl. phase transition)
  // -------------------------------------------------------------------------

  async update(id: string, requestData: UpdateProjectDto, userId: string) {
    const oldProject = await this.db.project.findUnique({
      where: { id },
      include: { sdlcPhases: true },
    });
    if (!oldProject) throw new NotFoundException('Project not found');

    const targetPhase = this.resolveTargetPhase(requestData, oldProject);
    const isPhaseChanged =
      !!requestData.currentPhase && requestData.currentPhase !== oldProject.currentPhase;
    const currentCycle = oldProject.cycle || 1; // PENTING: Hanya modifikasi cycle aktif

    const updatedProject = await this.db.$transaction(async (tx) => {
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
        include: PROJECT_INCLUDE,
      });
    });

    const { action, detail } = this.describeUpdateAction(
      oldProject,
      updatedProject,
      requestData,
      isPhaseChanged,
    );
    await this.audit.log(userId, action, detail, id);
    return updatedProject;
  }

  /** Resolve which phase the request targets, rejecting unknown phases. */
  private resolveTargetPhase(
    requestData: UpdateProjectDto,
    oldProject: { currentPhase: string },
  ): string {
    const targetPhase: string = requestData.currentPhase ?? oldProject.currentPhase;
    if (!targetPhase || !PHASE_SEQUENCE.includes(targetPhase as MasterPhase)) {
      throw new BadRequestException(`Fase project tidak valid: ${targetPhase ?? '(kosong)'}`);
    }
    return targetPhase;
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
    requestData: UpdateProjectDto,
  ) {
    const currentCycle = oldProject.cycle || 1;

    // Fase berubah. Selesaikan fase lama di cycle ini; status at-risk/overdue
    // dipertahankan supaya riwayat keterlambatan tidak hilang.
    const oldPhaseStatus =
      oldProject.status === 'overdue' || oldProject.status === 'at-risk'
        ? oldProject.status
        : 'completed';

    await tx.sDLCPhase.updateMany({
      where: { projectId: id, phaseName: oldProject.currentPhase, cycle: currentCycle },
      data: { status: oldPhaseStatus, progress: 100 },
    });

    // Cari atau buat fase baru di cycle ini
    const targetPhaseRow = await tx.sDLCPhase.findFirst({
      where: { projectId: id, phaseName: targetPhase, cycle: currentCycle },
    });
    const newStatus = requestData.phaseStatus || requestData.status || 'on-track';
    const newStartDate = requestData.phaseStartDate ? new Date(requestData.phaseStartDate) : new Date();
    const newDeadline = requestData.phaseDeadline ? new Date(requestData.phaseDeadline) : undefined;

    if (targetPhaseRow) {
      await tx.sDLCPhase.update({
        where: { id: targetPhaseRow.id },
        data: { status: newStatus, startDate: newStartDate, deadline: newDeadline },
      });
    } else {
      await tx.sDLCPhase.create({
        data: {
          status: newStatus,
          startDate: newStartDate,
          deadline: newDeadline,
          project: { connect: { id } },
          phaseName: targetPhase,
          cycle: currentCycle,
        },
      });
    }
  }

  /** Update detail fase aktif tanpa pindah fase (progress/deadline/status). */
  private async updateActivePhaseDetail(
    tx: Prisma.TransactionClient,
    id: string,
    targetPhase: string,
    currentCycle: number,
    requestData: UpdateProjectDto,
  ) {
    const phaseUpdatePayload: Prisma.SDLCPhaseUpdateManyMutationInput = {};
    if (requestData.phaseDeadline) phaseUpdatePayload.deadline = new Date(requestData.phaseDeadline);
    if (requestData.phaseStartDate) phaseUpdatePayload.startDate = new Date(requestData.phaseStartDate);
    if (requestData.phaseStatus) phaseUpdatePayload.status = requestData.phaseStatus;
    if (requestData.overallProgress !== undefined) {
      phaseUpdatePayload.progress = requestData.overallProgress;
    }

    if (Object.keys(phaseUpdatePayload).length > 0) {
      await tx.sDLCPhase.updateMany({
        where: { projectId: id, phaseName: targetPhase, cycle: currentCycle },
        data: phaseUpdatePayload,
      });
    }
  }

  /**
   * Map the request onto the project columns, assigning only fields that were
   * actually sent so partial requests never write undefined/NaN to other columns.
   */
  private buildProjectUpdate(
    requestData: UpdateProjectDto,
    targetPhase: string,
  ): Prisma.ProjectUpdateInput {
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

  /** Pick the audit action/detail that describes what this update changed. */
  private describeUpdateAction(
    oldProject: { status: string },
    updatedProject: { name: string },
    requestData: UpdateProjectDto,
    isPhaseChanged: boolean,
  ): { action: string; detail: string } {
    if (isPhaseChanged) {
      return {
        action: 'CHANGE_PHASE',
        detail: `Project ${updatedProject.name} pindah fase ke ${requestData.currentPhase}`,
      };
    }
    if (requestData.status && requestData.status !== oldProject.status) {
      return {
        action: 'UPDATE_STATUS',
        detail: `Ubah status project ${updatedProject.name} menjadi ${requestData.status}`,
      };
    }
    return { action: 'UPDATE_PROJECT', detail: `Update detail project ${updatedProject.name}` };
  }

  // -------------------------------------------------------------------------
  // Delete
  // -------------------------------------------------------------------------

  async remove(id: string, userId: string) {
    return this.support.deleteAndLog({
      load: () => this.db.project.findUnique({ where: { id } }),
      remove: () => this.db.project.delete({ where: { id } }),
      label: 'Project',
      userId,
      action: 'DELETE_PROJECT',
      details: (project) => `Menghapus project: ${project.name}`,
      projectId: (project) => project.id,
    });
  }

  // -------------------------------------------------------------------------
  // Cycle management ("smart automation")
  // -------------------------------------------------------------------------

  async nextCycle(id: string, userId: string, body?: { targetPhase?: string }) {
    const oldProject = await this.db.project.findUnique({
      where: { id },
      include: { sdlcPhases: true },
    });
    if (!oldProject) throw new NotFoundException('Project not found');

    const currentCycle = oldProject.cycle || 1;
    const nextCycle = currentCycle + 1;
    // Fase awal cycle baru (Default: Requirement, atau sesuai permintaan Frontend)
    const initialPhase = body?.targetPhase || DEFAULT_PHASE;

    const today = new Date();
    const newProjectDeadline = addMonths(today, 1);
    const newPhaseDeadline = addDays(today, 7);

    const updatedProject = await this.db.$transaction(async (tx) => {
      // 1. Kunci cycle lama: fase aktif disimpan, fase sebelumnya ditutup.
      await this.closeActiveCycle(tx, id, oldProject, currentCycle);

      // 2. Project pindah ke cycle baru dengan progress yang di-reset.
      await tx.project.update({
        where: { id },
        data: {
          cycle: nextCycle,
          overallProgress: 0,
          currentPhase: initialPhase,
          status: 'on-track',
          projectStartDate: today,
          projectDeadline: newProjectDeadline,
        },
      });

      // 3. Six fresh phase rows for the new cycle.
      await this.createCyclePhases(tx, id, initialPhase, nextCycle, {
        start: today,
        deadline: newPhaseDeadline,
      });

      return tx.project.findUnique({ where: { id }, include: { sdlcPhases: true } });
    });

    if (!updatedProject) throw new NotFoundException('Project not found after cycle rollover');

    await this.audit.log(
      userId,
      'NEXT_CYCLE',
      `Project ${updatedProject.name} dinaikkan ke Cycle ${nextCycle} mulai di fase ${initialPhase}`,
      updatedProject.id,
    );
    return updatedProject;
  }

  /** Lock the active cycle: freeze the active phase and close everything up to it. */
  private async closeActiveCycle(
    tx: Prisma.TransactionClient,
    id: string,
    oldProject: { currentPhase: string; overallProgress: number | null; status: string | null },
    currentCycle: number,
  ) {
    const currentActivePhase = oldProject.currentPhase;

    // Simpan progress & status aktual dari fase aktif di cycle lama
    await tx.sDLCPhase.updateMany({
      where: { projectId: id, cycle: currentCycle, phaseName: currentActivePhase },
      data: {
        progress: oldProject.overallProgress || 0,
        status: oldProject.status || 'completed',
      },
    });

    // Kunci semua fase yang dilewati sebelum fase aktif menjadi completed
    const activePhaseIndex = PHASE_SEQUENCE.indexOf(currentActivePhase as MasterPhase);
    if (activePhaseIndex !== -1) {
      for (let i = 0; i < activePhaseIndex; i++) {
        await tx.sDLCPhase.updateMany({
          where: { projectId: id, cycle: currentCycle, phaseName: PHASE_SEQUENCE[i] },
          data: { status: 'completed', progress: 100 },
        });
      }
    }

    // Kunci semua fase yang masih in-progress di cycle lama menjadi completed
    await tx.sDLCPhase.updateMany({
      where: { projectId: id, cycle: currentCycle, status: 'in-progress' },
      data: { status: 'completed', progress: 100 },
    });
  }

  /** Create the fresh set of master phases for a newly started cycle. */
  private async createCyclePhases(
    tx: Prisma.TransactionClient,
    id: string,
    initialPhase: string,
    cycle: number,
    dates: { start: Date; deadline: Date },
  ) {
    for (const phaseName of PHASE_SEQUENCE) {
      const isInitial = phaseName === initialPhase;
      await tx.sDLCPhase.create({
        data: {
          projectId: id,
          phaseName,
          cycle,
          status: isInitial ? 'on-track' : 'pending',
          progress: 0, // Reset progress per fase
          startDate: isInitial ? dates.start : null,
          deadline: isInitial ? dates.deadline : null,
        },
      });
    }
  }
}

const defaultDeadlineInOneMonth = (): Date => addMonths(new Date(), 1);
const defaultDeadlineInOneWeek = (): Date => addDays(new Date(), 7);

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
