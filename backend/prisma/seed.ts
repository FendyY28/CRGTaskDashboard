import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seeding...');

  // 1. BERSIHKAN DATABASE (Hapus Child dulu baru Parent)
  await prisma.defect.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.task.deleteMany();
  await prisma.weeklyProgress.deleteMany();
  await prisma.sDLCPhase.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.improvement.deleteMany();
  await prisma.project.deleteMany();
  
  console.log('🧹 Database cleaned.');

  // -----------------------------------------------------------------------
  // PROJECT 1: MOBILE BANKING (Data Lengkap)
  // -----------------------------------------------------------------------
  const project1 = await prisma.project.create({
    data: {
      id: 'PRJ-001',
      name: 'Mobile Banking Enhancement',
      currentPhase: 'Development',
      overallProgress: 65,
      status: 'on-track',
      pic: 'Ahmad Hidayat',
      cycle: 1,
      projectStartDate: new Date('2025-10-01'),
      projectDeadline: new Date('2026-03-31'),
      
      // A. Phases Timeline
      sdlcPhases: {
        create: [
          { phaseName: 'Requirement', startDate: new Date('2025-10-01'), deadline: new Date('2025-11-01'), status: 'completed' },
          { phaseName: 'TF Meeting', startDate: new Date('2025-11-01'), deadline: new Date('2025-11-05'), status: 'completed' },
          { phaseName: 'Development', startDate: new Date('2025-11-06'), deadline: new Date('2026-01-30'), status: 'in-progress' },
          { phaseName: 'SIT', startDate: new Date('2026-02-01'), deadline: new Date('2026-02-20'), status: 'pending' },
        ]
      },

      // B. Weekly Progress
      weeklyProgress: {
        create: [
          {
            weekRange: 'Week 1 (Oct 1-7)', progress: 100, completed: 5, total: 5,
            tasks: {
              create: [
                { taskId: 'REQ-01', taskName: 'Gather user stories', status: 'completed', completedDate: new Date('2025-10-03') },
                { taskId: 'REQ-02', taskName: 'Define technical specs', status: 'completed', completedDate: new Date('2025-10-05') }
              ]
            }
          },
          {
            weekRange: 'Week 12 (Jan 1-7)', progress: 60, completed: 3, total: 5,
            tasks: {
              create: [
                { taskId: 'DEV-55', taskName: 'API Integration for QRIS', status: 'completed', completedDate: new Date('2026-01-02') },
                { taskId: 'DEV-56', taskName: 'Frontend Login Screen', status: 'in-progress' },
                { taskId: 'DEV-57', taskName: 'Database Migration', status: 'pending' }
              ]
            }
          }
        ]
      },

      // C. QA Data
      testCases: {
        create: [
          {
            title: 'Login with valid credentials',
            type: 'positive',
            status: 'pass',
            notes: 'Smooth login. (Tester: Budi Santoso)',
          },
          {
            title: 'Transfer with insufficient balance',
            type: 'negative',
            status: 'fail',
            notes: 'Error message not showing. (Tester: Siti Aminah)',
            
            defect: {
              create: {
                description: 'Toast error message is hidden behind keyboard',
                severity: 'Medium',
                status: 'open'
              }
            }
          }
        ]
      },

      // D. PIR Data
      issues: {
        create: [
          { 
            issueId: 'ISS-001', 
            title: 'Network Timeout during Peak Hours', // ✅ FIX: Field title ditambahkan
            priority: 'high', 
            description: 'Server timeout during peak hours between 10AM - 12PM', 
            impactArea: 'Performance', 
            reportedBy: 'DevOps Team', 
            reportedDate: new Date('2025-12-15'), 
            status: 'open' 
          }
        ]
      },
      improvements: {
        create: [
          { noteId: 'IMP-001', reviewer: 'QA Lead', developer: 'Backend Lead', feedback: 'Code refactoring needed for Payment Module', recommendations: 'Use Microservices', priority: 'medium', createdDate: new Date() }
        ]
      }
    },
  })

  // -----------------------------------------------------------------------
  // PROJECT 2: WEBSITE REVAMP (Contoh CYCLE 2)
  // -----------------------------------------------------------------------
  const project2 = await prisma.project.create({
    data: {
      id: 'PRJ-002',
      name: 'Corporate Website Revamp',
      currentPhase: 'Live', // Diubah ke Live agar muncul di PIR Dashboard
      overallProgress: 100,
      status: 'on-track',
      pic: 'Sarah Permata',
      cycle: 1, 
      projectStartDate: new Date('2025-01-01'),
      projectDeadline: new Date('2025-12-30'),
      
      sdlcPhases: {
        create: [
          { phaseName: 'Live', startDate: new Date('2025-12-01'), deadline: new Date('2025-12-20'), status: 'completed' },
        ]
      },
      
      issues: {
        create: [
          { 
            issueId: 'ISS-002', 
            title: 'Footer Link Broken', // ✅ FIX: Field title ditambahkan
            priority: 'low', 
            description: 'The social media links in the footer are pointing to 404 pages.', 
            impactArea: 'Functionality', 
            reportedBy: 'Marketing Team', 
            status: 'open' 
          }
        ]
      }
    }
  })

  console.log('✅ Seeding finished.')
  console.log({ project1, project2 })
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })