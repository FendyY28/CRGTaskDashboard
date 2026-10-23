import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/*
 * Payload DTOs for the endpoints the frontend actually calls.
 *
 * `@IsOptional()` is purposeful throughout: ValidationPipe runs with
 * `skippable: true`, so an absent optional field is not "validated". An
 * explicit `null` still fails, which is what we want — Prisma rejects null for
 * non-nullable columns anyway, and a 400 is clearer than a 500.
 */

const MAX_TEXT = 5000;

// ---------------------------------------------------------------------------
// Weekly logs & tasks
// ---------------------------------------------------------------------------

export class LogTaskInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama task wajib diisi.' })
  @MaxLength(200)
  taskName!: string;

  @IsString()
  @MaxLength(MAX_TEXT)
  description!: string;
}

export class AddLogDto {
  @IsString()
  @IsNotEmpty({ message: 'Project wajib dipilih.' })
  @MaxLength(64)
  projectId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Rentang minggu wajib diisi.' })
  @MaxLength(80)
  weekRange!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  // The form sends one task per line; the service also accepts a plain string.
  @IsArray()
  @ArrayMaxSize(200, { message: 'Maksimal 200 task per log.' })
  @ValidateNested({ each: true })
  @Type(() => LogTaskInputDto)
  tasks!: LogTaskInputDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class UpdateLogDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  weekRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  tasks?: unknown[];
}

export class AddTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama task wajib diisi.' })
  @MaxLength(200)
  taskName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi task wajib diisi.' })
  @MaxLength(MAX_TEXT)
  description!: string;
}

// ---------------------------------------------------------------------------
// PIR — issues & improvements
// ---------------------------------------------------------------------------

export const ISSUE_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;
export const ISSUE_STATUSES = ['open', 'in-progress', 'resolved'] as const;

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul issue wajib diisi.' })
  @MaxLength(200)
  title!: string;

  @IsIn(ISSUE_PRIORITIES, { message: 'Priority tidak valid.' })
  priority!: string;

  @IsString()
  @IsNotEmpty({ message: 'Deskripsi issue wajib diisi.' })
  @MaxLength(MAX_TEXT)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  impactArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reportedBy?: string;

  @IsOptional()
  @IsString()
  reportedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  issueId?: string;
}

export class UpdateIssueDto {
  @IsIn(ISSUE_STATUSES, { message: 'Status issue tidak valid.' })
  status!: string;
}

export class CreateImprovementDto {
  /** Optional: the form's "title" is folded into `feedback` by the service. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  feedback?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reviewer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  developer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  recommendations?: string;

  @IsOptional()
  @IsIn(ISSUE_PRIORITIES, { message: 'Priority tidak valid.' })
  priority?: string;
}

// ---------------------------------------------------------------------------
// QA — test cases & defects
// ---------------------------------------------------------------------------

export const TEST_CASE_TYPES = ['positive', 'negative'] as const;
export const TEST_CASE_STATUSES = ['pending', 'pass', 'fail'] as const;
export const DEFECT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export class DefectInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Deskripsi defect wajib diisi.' })
  @MaxLength(MAX_TEXT)
  description!: string;

  @IsIn(DEFECT_SEVERITIES, { message: 'Severity defect tidak valid.' })
  severity!: string;
}

export class CreateTestCaseDto {
  @IsString()
  @IsNotEmpty({ message: 'Judul test case wajib diisi.' })
  @MaxLength(200)
  title!: string;

  @IsIn(TEST_CASE_TYPES, {
    message: 'Tipe test case harus positive atau negative.',
  })
  type!: string;

  @IsString()
  @IsNotEmpty({ message: 'Project wajib dipilih.' })
  @MaxLength(64)
  projectId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  notes?: string;
}

export class UpdateTestCaseDto {
  @IsIn(TEST_CASE_STATUSES, { message: 'Status test case tidak valid.' })
  status!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DefectInputDto)
  defect?: DefectInputDto;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEXT)
  takeoutReason?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

// ---------------------------------------------------------------------------
// Cycle & phase notes
// ---------------------------------------------------------------------------

export class NextCycleDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  targetPhase?: string;
}

export class AddPhaseNoteDto {
  @IsString()
  @IsNotEmpty({ message: 'Catatan tidak boleh kosong.' })
  @MaxLength(MAX_TEXT)
  content!: string;
}
