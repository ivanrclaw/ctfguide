import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateInvitationDto {
  @IsUUID()
  @IsNotEmpty()
  guideId: string;

  /** Email or username of the person to invite */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}

export class AcceptInvitationDto {
  // No body fields needed — invitation ID comes from the URL param
}

export class DeclineInvitationDto {
  // No body fields needed — invitation ID comes from the URL param
}