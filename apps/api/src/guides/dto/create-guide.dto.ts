import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class CreateGuideDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  ctfName: string;

  @IsString()
  category: string;

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  difficulty?: string;
}

export class UpdateGuideDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ctfName?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(['beginner', 'intermediate', 'advanced'])
  @IsOptional()
  difficulty?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;
}