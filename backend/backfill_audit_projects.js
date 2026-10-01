/**
 * Backfill script: update audit logs with null projectId by matching
 * project names or IDs found in the `details` text.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fetch all projects
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  console.log(`Found ${projects.length} projects:`, projects.map(p => `${p.id}: ${p.name}`));

  // Fetch all logs with null projectId
  const nullLogs = await prisma.auditLog.findMany({
    where: { projectId: null },
    select: { id: true, action: true, details: true, userName: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nFound ${nullLogs.length} logs with null projectId`);

  let updated = 0;
  let skipped = 0;

  for (const log of nullLogs) {
    const detailsLower = (log.details || '').toLowerCase();
    let matchedProjectId = null;

    // Try to match by project ID (e.g. "PRJ-001")
    for (const project of projects) {
      if (detailsLower.includes(project.id.toLowerCase())) {
        matchedProjectId = project.id;
        break;
      }
    }

    // Try to match by project name if no ID match
    if (!matchedProjectId) {
      for (const project of projects) {
        if (detailsLower.includes(project.name.toLowerCase())) {
          matchedProjectId = project.id;
          break;
        }
      }
    }

    if (matchedProjectId) {
      await prisma.auditLog.update({
        where: { id: log.id },
        data: { projectId: matchedProjectId }
      });
      console.log(`  ✅ [${log.action}] "${log.details.substring(0, 60)}" -> ${matchedProjectId}`);
      updated++;
    } else {
      console.log(`  ⬜ [${log.action}] "${log.details.substring(0, 60)}" -> no match`);
      skipped++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Skipped (no match): ${skipped}`);
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
