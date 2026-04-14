import { IsString, IsNumber, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreatePhaseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', 'password', 'llm'])
  unlockType?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsNumber()
  order: number;
}

export class UpdatePhaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', 'password', 'llm'])
  unlockType?: string;

  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}

export class ReorderPhasesDto {
  @IsNotEmpty()
  phaseIds: string[];
}

export class VerifyPhaseDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  answer?: string;
}

/** @deprecated Use VerifyPhaseDto instead */
export class VerifyPhasePasswordDto extends VerifyPhaseDto {}