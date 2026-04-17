import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class JoinSessionDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class SubmitPhaseAnswerDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  answer?: string;
}

export class ReconnectSessionDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}
