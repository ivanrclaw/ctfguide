import { Controller, Get, Post, Patch, Delete, Body, Param, Req, Res, UseGuards, Header } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { GuidesService } from './guides.service';
import { PdfService } from './pdf.service';
import { InvitationsService } from '../invitations/invitations.service';
import { CreateGuideDto, UpdateGuideDto } from './dto/create-guide.dto';

@Controller('guides')
@UseGuards(AuthGuard('jwt'))
export class GuidesController {
  constructor(
    private readonly guidesService: GuidesService,
    private readonly invitationsService: InvitationsService,
    private readonly pdfService: PdfService,
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

  @Get(':id/export/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportPdf(@Req() req: Request, @Res() res: Response, @Param('id') id: string) {
    const user = req.user as { id: string };

    // Try owner first, then collaborator
    let guide: any;
    try {
      guide = await this.guidesService.findOne(id, user.id);
    } catch {
      // Not the owner — check if accepted collaborator
      guide = await this.invitationsService.findOneAsCollaborator(id, user.id);
    }

    if (!guide || !guide.id) {
      return res.status(403).json({ message: 'You do not have access to this guide' });
    }

    const pdfBuffer = await this.pdfService.generateGuidePdf(guide);
    const safeName = (guide.title || 'guide').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.end(pdfBuffer);
  }
}