import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto, AcceptInvitationDto, DeclineInvitationDto } from './dto/invitation.dto';

@Controller('invitations')
@UseGuards(AuthGuard('jwt'))
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
    @Request() req: any,
  ) {
    return this.invitationsService.createInvitation(createInvitationDto, req.user.id);
  }

  @Get('my')
  async getMyInvitations(@Request() req: any) {
    return this.invitationsService.getUserInvitations(req.user.id);
  }

  @Get('collaborated')
  async getMyCollaboratedGuides(@Request() req: any) {
    return this.invitationsService.getUserCollaboratedGuides(req.user.id);
  }

  @Get('guide/:guideId')
  async getGuideCollaborators(
    @Param('guideId') guideId: string,
    @Request() req: any,
  ) {
    return this.invitationsService.getGuideCollaborators(guideId, req.user.id);
  }

  @Delete(':id/collaborator')
  async removeCollaborator(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    await this.invitationsService.removeCollaborator(id, req.user.id);
    return { removed: true };
  }

  @Put(':id/accept')
  async acceptInvitation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.invitationsService.acceptInvitation(id, req.user.id);
  }

  @Put(':id/decline')
  async declineInvitation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.invitationsService.declineInvitation(id, req.user.id);
  }

  @Delete(':id')
  async cancelInvitation(@Param('id') id: string, @Request() req: any) {
    return this.invitationsService.cancelInvitation(id, req.user.id);
  }
}