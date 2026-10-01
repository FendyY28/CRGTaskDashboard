-- Add the optional project relation used by the audit API
ALTER TABLE "AuditLog" ADD COLUMN "projectId" TEXT;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");
