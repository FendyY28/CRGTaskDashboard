import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { MASTER_PHASES, PROJECT_STATUSES } from './create-project.dto';
import type { MasterPhase, ProjectStatus } from './create-project.dto';

// PartialType(CreateProjectDto) from @nestjs/mapped-types is expanded manually below.
// The helper only copies decorator metadata, so the resulting DTO behaves the same,
// but it lets the package stay out of the ESM-only release line (v12+).
export class UpdateProjectDto {
  // --- Fields inherited from CreateProjectDto (all optional) ---
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  pic?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  overallProgress?: number;

  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @IsOptional()
  @IsISO8601()
  deadline?: string;

  @IsOptional()
  @IsISO8601()
  phaseStartDate?: string;

  @IsOptional()
  @IsISO8601()
  phaseDeadline?: string;

  // --- Fields originally declared on UpdateProjectDto ---
  /** Fase aktif SDLC — dibatasi ke fase yang dikenal backend. */
  @IsOptional()
  @IsIn(MASTER_PHASES)
  currentPhase?: MasterPhase;

  /** Status global project. */
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  /** Status khusus fase aktif (nilainya mengikuti PROJECT_STATUSES). */
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  phaseStatus?: ProjectStatus;

  @IsOptional()
  @IsISO8601()
  projectStartDate?: string;

  @IsOptional()
  @IsISO8601()
  projectDeadline?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}
