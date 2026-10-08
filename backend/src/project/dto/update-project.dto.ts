import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { CreateProjectDto, MASTER_PHASES, PROJECT_STATUSES } from './create-project.dto';
import type { MasterPhase, ProjectStatus } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
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
