import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GuidesService } from './guides.service';
import { InvitationsService } from '../invitations/invitations.service';
import { CreateGuideDto, UpdateGuideDto } from './dto/create-guide.dto';

@Controller('guides')
@UseGuards(AuthGuard('jwt'))
export class GuidesController {
  constructor(
    private readonly guidesService: GuidesService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateGuideDto) {
    const user = req.user as { id: string };
    return this.guidesService.create(user.id, dto);
  }

  @Get()
  async findAll(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.guidesService.findAllByUser(user.id);
  }

  @Get('collaborated')
  async findAllCollaborated(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.invitationsService.getUserCollaboratedGuides(user.id);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    try {
      return await this.guidesService.findOne(id, user.id);
    } catch {
      // If not the author, check if user is an accepted collaborator
      return this.invitationsService.findOneAsCollaborator(id, user.id);
    }
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateGuideDto) {
    const user = req.user as { id: string };
    return this.guidesService.update(id, user.id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.guidesService.remove(id, user.id);
    return { deleted: true };
  }
}