import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

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
  @IsNumber()
  order?: number;
}

export class ReorderPhasesDto {
  @IsNotEmpty()
  phaseIds: string[];
}

export class VerifyPhasePasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}