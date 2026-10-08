import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/** Fase SDLC yang dikenal backend (harus sama dengan ProjectService.MASTER_PHASES). */
export const MASTER_PHASES = ['Requirement', 'TF Meeting', 'Development', 'SIT', 'UAT', 'Live'] as const;
export type MasterPhase = (typeof MASTER_PHASES)[number];

/** Status global project yang ditampilkan di header card. */
export const PROJECT_STATUSES = ['on-track', 'at-risk', 'overdue', 'completed', 'in-progress', 'pending'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export class CreateProjectDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  pic!: string;

  @IsOptional()
  @IsIn(MASTER_PHASES)
  currentPhase?: MasterPhase;

  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

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
}
