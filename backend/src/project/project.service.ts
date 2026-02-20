import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  private readonly MASTER_PHASES = ["Requirement", "TF Meeting", "Development", "SIT", "UAT", "Live"];

  // ==========================================================
  // 1. BASIC CRUD (FIND)
  // ==========================================================
  async findAll() {
    return this.prisma.project.findMany({
      include: { 
        sdlcPhases: true,
        issues: true, 
        weeklyProgress: { 
          include: { tasks: { orderBy: { id: 'asc' } } }, 
          orderBy: { id: 'desc' } 
        }, 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { 
        sdlcPhases: { orderBy: [{ cycle: 'asc' }, { id: 'asc' }] },
        weeklyProgress: { 
          include: { tasks: { orderBy: { id: 'asc' } } }, 
          orderBy: { id: 'desc' } 
        },
        testCases: { include: { defect: true } }, 
        issues: { orderBy: { reportedDate: 'desc' } }, 
        improvements: { orderBy: { createdDate: 'desc' } } 
      }
    });
  }

  // ==========================================================
  // 2. CREATE PROJECT
  // ==========================================================
  async create(data: any, userId: string) {
    const generatedId = `PRJ-${Date.now().toString().slice(-4)}`; 
    const initialPhase = data.currentPhase || "Requirement";

    const newProject = await this.prisma.project.create({
      data: {
        id: data.code || generatedId, 
        name: data.name,
        pic: data.pic,
        currentPhase: initialPhase,
        status: data.status || "on-track",
        overallProgress: typeof data.overallProgress === 'string' ? parseInt(data.overallProgress) : (data.overallProgress || 0),
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
    });
    // Audit log mencatat user
    await this.auditService.log(userId, "CREATE_PROJECT", `Membuat project baru: ${newProject.name}`);
    return newProject;
  }

  // ==========================================================
  // 3. UPDATE PROJECT
  // ==========================================================
  async update(id: string, requestData: any, userId: string) {
    const oldProject = await this.prisma.project.findUnique({ where: { id }, include: { sdlcPhases: true } });
    if (!oldProject) throw new NotFoundException("Project not found");
    
    const oldPhaseIndex = this.MASTER_PHASES.indexOf(oldProject.currentPhase);
    const newPhaseIndex = this.MASTER_PHASES.indexOf(requestData.currentPhase);
    const isPhaseChanged = requestData.currentPhase && (requestData.currentPhase !== oldProject.currentPhase);
    const isNewCycle = (oldPhaseIndex >= 4 && newPhaseIndex === 0);

    const updatedProject = await this.prisma.$transaction(async (tx) => {
      if (isNewCycle) {
          const nextCycle = (oldProject.cycle || 1) + 1;
          const today = new Date();
          const newGlobalDeadline = new Date(today);
          newGlobalDeadline.setMonth(newGlobalDeadline.getMonth() + 2);
          const newReqDeadline = new Date(today);
          newReqDeadline.setDate(newReqDeadline.getDate() + 7);

          await tx.sDLCPhase.updateMany({
            where: { projectId: id, cycle: oldProject.cycle, phaseName: oldProject.currentPhase, status: 'in-progress' },
            data: { status: 'completed' } 
          });

          await tx.project.update({ 
              where: { id }, 
              data: { cycle: nextCycle, overallProgress: 0, currentPhase: 'Requirement', status: 'on-track',
                  projectStartDate: requestData.projectStartDate ? new Date(requestData.projectStartDate) : today,
                  projectDeadline: requestData.projectDeadline ? new Date(requestData.projectDeadline) : newGlobalDeadline
              } 
          });
          
          for (const phaseName of this.MASTER_PHASES) {
            const isReq = phaseName === 'Requirement';
            await tx.sDLCPhase.create({
              data: { projectId: id, phaseName, cycle: nextCycle, status: isReq ? 'in-progress' : 'pending',
                  startDate: isReq ? (requestData.phaseStartDate ? new Date(requestData.phaseStartDate) : today) : null, 
                  deadline: isReq ? (requestData.phaseDeadline ? new Date(requestData.phaseDeadline) : newReqDeadline) : null 
              }
            });
          }
      } 
      else if (isPhaseChanged) {
          const currentCycle = oldProject.cycle || 1;
          let newStatusForOldPhase = oldProject.status === 'overdue' || oldProject.status === 'at-risk' ? oldProject.status : 'completed';

          await tx.sDLCPhase.updateMany({ 
            where: { projectId: id, phaseName: oldProject.currentPhase, cycle: currentCycle }, 
            data: { status: newStatusForOldPhase } 
          });

          const targetPhase = await tx.sDLCPhase.findFirst({ where: { projectId: id, phaseName: requestData.currentPhase, cycle: currentCycle } });
          const newPhaseData: any = { 
              status: requestData.phaseStatus || 'in-progress', 
              startDate: requestData.phaseStartDate ? new Date(requestData.phaseStartDate) : new Date(), 
              deadline: requestData.phaseDeadline ? new Date(requestData.phaseDeadline) : undefined 
          };

          if (targetPhase) { await tx.sDLCPhase.update({ where: { id: targetPhase.id }, data: newPhaseData }); } 
          else { await tx.sDLCPhase.create({ data: { projectId: id, phaseName: requestData.currentPhase, cycle: currentCycle, ...newPhaseData } as any }); }
      } 
      else {
          const currentCycle = oldProject.cycle || 1;
          const phaseUpdatePayload: any = {};
          if (requestData.phaseDeadline) phaseUpdatePayload.deadline = new Date(requestData.phaseDeadline);
          if (requestData.phaseStartDate) phaseUpdatePayload.startDate = new Date(requestData.phaseStartDate);
          if (requestData.phaseStatus) phaseUpdatePayload.status = requestData.phaseStatus;

          if (Object.keys(phaseUpdatePayload).length > 0) { 
            await tx.sDLCPhase.updateMany({ where: { projectId: id, phaseName: requestData.currentPhase, cycle: currentCycle }, data: phaseUpdatePayload }); 
          }
      }

      if (!isNewCycle) {
          const projectUpdateData: Prisma.ProjectUpdateInput = {
            name: requestData.name, pic: requestData.pic, currentPhase: requestData.currentPhase, status: requestData.status,
            overallProgress: typeof requestData.overallProgress === 'string' ? parseInt(requestData.overallProgress) : requestData.overallProgress,
          };
          if (requestData.projectStartDate) projectUpdateData.projectStartDate = new Date(requestData.projectStartDate);
          if (requestData.projectDeadline) projectUpdateData.projectDeadline = new Date(requestData.projectDeadline);
          
          return tx.project.update({ where: { id }, data: projectUpdateData, include: { sdlcPhases: true, weeklyProgress: true } });
      } else {
          return tx.project.findUnique({ where: { id }, include: { sdlcPhases: true } });
      }
    });

    if (!updatedProject) throw new Error("Gagal mengupdate project.");

    let action = "UPDATE_PROJECT";
    let detail = `Update detail project ${updatedProject.name}`;

    if (isNewCycle) {
        action = "RESET_CYCLE";
        detail = `Project ${updatedProject.name} masuk ke Cycle ${(oldProject.cycle || 1) + 1}`;
    } else if (isPhaseChanged) {
        action = "CHANGE_PHASE";
        detail = `Project ${updatedProject.name} pindah fase ke ${requestData.currentPhase}`;
    } else if (requestData.status && requestData.status !== oldProject.status) {
        action = "UPDATE_STATUS";
        detail = `Ubah status project ${updatedProject.name} menjadi ${requestData.status}`;
    } else if (requestData.overallProgress && requestData.overallProgress !== oldProject.overallProgress) {
        action = "UPDATE_PROGRESS";
        detail = `Update progress project ${updatedProject.name} menjadi ${requestData.overallProgress}%`;
    }

    await this.auditService.log(userId, action, detail);
    return updatedProject;
  } 

  // ==========================================================
  // 4. DELETE PROJECT
  // ==========================================================
  async remove(id: string, userId: string) { 
    const project = await this.prisma.project.findUnique({ where: { id }});
    const deleted = await this.prisma.project.delete({ where: { id } }); 
    await this.auditService.log(userId, "DELETE_PROJECT", `Menghapus project: ${project ? project.name : id}`);
    return deleted;
  }

  // ==========================================================
  // 5. ISSUES & IMPROVEMENTS
  // ==========================================================
  async findAllIssues() {
    return this.prisma.issue.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { reportedDate: 'desc' }
    });
  }

  async createIssue(data: any, userId: string) {
    const issue = await this.prisma.issue.create({
      data: {
        issueId: data.issueId, title: data.title, priority: data.priority, description: data.description,
        impactArea: data.impactArea || "General", reportedBy: data.reportedBy || "System", status: "open", projectId: data.projectId
      }
    });
    // await this.auditService.log(userId, "CREATE_ISSUE", `Report Issue baru: ${data.title} (${data.issueId})`);
    return issue;
  }

  async updateIssue(id: number, data: any, userId: string) {
    const issue = await this.prisma.issue.update({ where: { id: Number(id) }, data: { status: data.status } });
    // await this.auditService.log(userId, "UPDATE_ISSUE", `Update status Issue ${issue.issueId} menjadi ${data.status}`);
    return issue;
  }

  async removeIssue(id: number, userId: string) {
    const issue = await this.prisma.issue.delete({ where: { id: Number(id) } });
    // await this.auditService.log(userId, "DELETE_ISSUE", `Menghapus Issue: ${issue.title}`);
    return issue;
  }

  async createImprovement(data: any, userId: string) {
    const imp = await this.prisma.improvement.create({
      data: { noteId: data.noteId, reviewer: data.reviewer, developer: data.developer, feedback: data.feedback, recommendations: data.recommendations, priority: data.priority, projectId: data.projectId }
    });
    // await this.auditService.log(userId, "ADD_IMPROVEMENT", `Menambah catatan improvement untuk project`);
    return imp;
  }

  // ==========================================================
  // 6. WEEKLY PROGRESS (TIMELINE)
  // ==========================================================
  async addLog(data: any, userId: string) {
    const taskList = Array.isArray(data.tasks) ? data.tasks : [data.tasks];
    const log = await this.prisma.weeklyProgress.create({
      data: {
        projectId: data.projectId, weekRange: data.weekRange, progress: parseInt(data.progress) || 0, completed: 0, total: taskList.length,
        tasks: { create: taskList.map((taskName: string, index: number) => ({ taskId: `TSK-${Date.now()}-${index}`, taskName: taskName, status: 'in-progress', completedDate: null })) }
      }
    });
    // await this.auditService.log(userId, "ADD_WEEKLY_LOG", `Menambah Weekly Progress ${data.weekRange}`);
    return log;
  }

  async removeLog(id: number, userId: string) {
    // 1. Cari data dulu untuk keperluan Log Audit (Opsional tapi bagus)
    const log = await this.prisma.weeklyProgress.findUnique({ 
        where: { id: Number(id) } 
    });

    if (!log) throw new NotFoundException("Log not found");

    // 2. Hapus data (Task di dalamnya otomatis terhapus karena Cascade Delete di Schema)
    const deleted = await this.prisma.weeklyProgress.delete({ 
        where: { id: Number(id) } 
    });

    // 3. Catat siapa yang menghapus
    // await this.auditService.log(userId, "DELETE_WEEKLY_LOG", `Menghapus Weekly Log: ${log.weekRange}`);
    
    return deleted;
  }

  async updateLog(weeklyId: number, data: any, userId: string) { 
      const log = await this.prisma.weeklyProgress.update({ where: { id: Number(weeklyId) }, data: { progress: parseInt(data.progress), ...(data.weekRange && { weekRange: data.weekRange }) } }); 
      // await this.auditService.log(userId, "UPDATE_WEEKLY_LOG", `Update Weekly Progress ID ${weeklyId}`);
      return log;
  }

  async toggleTask(taskId: number, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, });
    if (!task) throw new Error("Task not found");
    const newStatus = task.status === 'completed' ? 'in-progress' : 'completed';
    await this.prisma.task.update({ where: { id: taskId }, data: { status: newStatus, completedDate: newStatus === 'completed' ? new Date() : null } });
    const parentWeek = await this.prisma.weeklyProgress.findUnique({ where: { id: task.weeklyProgressId }, include: { tasks: true } });
    if (parentWeek) {
      const total = parentWeek.tasks.length;
      const completed = parentWeek.tasks.filter(t => t.status === 'completed').length;
      await this.prisma.weeklyProgress.update({ where: { id: parentWeek.id }, data: { progress: total > 0 ? Math.round((completed / total) * 100) : 0, completed: completed, total: total } });
    }
    // await this.auditService.log(userId, "TOGGLE_TASK", `Mengubah status task ${task.taskName} menjadi ${newStatus}`);
    return { status: "updated", newStatus };
  }

  async removeTask(taskId: number, userId: string) {
    // 1. Cari Task & Parentnya dulu (sebelum dihapus)
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { weeklyProgress: true } // Ambil info induknya
    });

    if (!task) throw new NotFoundException("Task not found");

    // 2. Hapus Task
    await this.prisma.task.delete({ where: { id: taskId } });

    // 3. HITUNG ULANG PROGRESS INDUKNYA (Penting!)
    // Ambil ulang parent beserta sisa task-nya
    const parent = await this.prisma.weeklyProgress.findUnique({
        where: { id: task.weeklyProgressId },
        include: { tasks: true }
    });

    if (parent) {
        const total = parent.tasks.length;
        // Jika sisa task 0, progress 0. Jika ada, hitung persentase.
        const completed = parent.tasks.filter(t => t.status === 'completed').length;
        const newProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

        await this.prisma.weeklyProgress.update({
            where: { id: parent.id },
            data: { 
                total: total, 
                completed: completed, 
                progress: newProgress 
            }
        });
    }

    // 4. Audit Log
    // await this.auditService.log(userId, "DELETE_TASK", `Menghapus Task: ${task.taskName}`);
    
    return { status: "deleted", taskId };
  }

  // ==========================================================
  // 7. TESTING (TEST CASES & DEFECTS) - UPDATED
  // ==========================================================
  async getTestingStatus() { return this.prisma.project.findMany({ where: { currentPhase: 'UAT' }, select: { id: true, name: true, testCases: { include: { defect: true } } } }); }
  async getTestCases(projectId: string) { return this.prisma.testCase.findMany({ where: { projectId }, include: { defect: true }, orderBy: { createdAt: 'desc' } }); }
  
  // 🔥 CREATE dengan pencarian User yang lebih standar
  async createTestCase(data: any, userId: string) { 
      // Kita coba cari user secara proper
      let userName = "Unknown User";
      if (userId) {
          const user = await this.prisma.user.findFirst({ where: { OR: [{ id: userId }, { email: userId }] } });
          if (user) {
              userName = user.name;
          }
      }

      const tc = await this.prisma.testCase.create({ 
        data: { 
          projectId: data.projectId, 
          title: data.title, 
          type: data.type, 
          notes: data.notes, 
          status: 'pending',
          updatedBy: userName // ✅ Set pembuat sebagai updater pertama
        } 
      }); 
      // await this.auditService.log(userId, "CREATE_TEST_CASE", `Membuat Test Case: ${data.title}`);
      return tc;
  }
  
  // 🔥 UPDATE dengan pencarian User yang lebih standar
  async updateTestCase(id: string, data: any, userId: string) {
    const { status, notes, defect } = data;

    // Kita cari user secara proper (mirip Create)
    let userName = "Unknown User";
    if (userId) {
        const user = await this.prisma.user.findFirst({ where: { OR: [{ id: userId }, { email: userId }] } });
        if (user) {
            userName = user.name;
        }
    }

    const tc = await this.prisma.testCase.update({ 
      where: { id }, 
      data: { 
        status, 
        notes,
        updatedBy: userName // ✅ Update nama pelaksana terakhir
      } 
    });
    
    if (status === 'fail' && defect) { 
        await this.prisma.defect.upsert({ 
            where: { testCaseId: id }, 
            update: { description: defect.description, severity: defect.severity, status: 'open' }, 
            create: { testCaseId: id, description: defect.description, severity: defect.severity, status: 'open' } 
        }); 
    } else if (status === 'pass' || status === 'pending') { 
        await this.prisma.defect.deleteMany({ where: { testCaseId: id } }); 
    }
    
    // await this.auditService.log(userId, "UPDATE_TEST_CASE", `Update status Test Case menjadi ${status}`);
    return tc;
  }
  
  async deleteTestCase(id: string, userId: string) { 
      // 1. Cari Nama User Pelaku
      let userName = "Unknown User";
      if (userId) {
          const user = await this.prisma.user.findFirst({ where: { OR: [{ id: userId }, { email: userId }] } });
          if (user) userName = user.name;
      }

      // 2. Lakukan SOFT DELETE (Update status, bukan hapus data)
      const tc = await this.prisma.testCase.update({ 
          where: { id }, 
          data: { 
              isDeleted: true,       // Tandai terhapus
              deletedBy: userName,   // Catat pelaku
              deletedAt: new Date()  // Catat waktu
          } 
      }); 

      // Tidak perlu auditService.log global jika tidak diinginkan
      return tc;
  }
}