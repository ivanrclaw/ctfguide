import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { PhasesService } from './phases.service';
import { CreatePhaseDto, UpdatePhaseDto, ReorderPhasesDto, VerifyPhasePasswordDto } from './dto/phase.dto';

@Controller('phases')
export class PhasesController {
  constructor(private readonly phasesService: PhasesService) {}

  @Post('guide/:guideId')
  async create(
    @Req() req: Request,
    @Param('guideId') guideId: string,
    @Body() dto: CreatePhaseDto,
  ) {
    const user = req.user as { id: string };
    return this.phasesService.create(user.id, guideId, dto);
  }

  @Get('guide/:guideId')
  async findByGuide(@Req() req: Request, @Param('guideId') guideId: string) {
    const user = req.user as { id: string };
    return this.phasesService.findByGuide(user.id, guideId);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.phasesService.findOne(user.id, id);
  }

  @Patch(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdatePhaseDto) {
    const user = req.user as { id: string };
    return this.phasesService.update(user.id, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    await this.phasesService.remove(user.id, id);
    return { deleted: true };
  }

  @Post('guide/:guideId/reorder')
  async reorder(
    @Req() req: Request,
    @Param('guideId') guideId: string,
    @Body() dto: ReorderPhasesDto,
  ) {
    const user = req.user as { id: string };
    return this.phasesService.reorder(user.id, guideId, dto);
  }

  @Post(':id/verify')
  async verifyPassword(@Param('id') id: string, @Body() dto: VerifyPhasePasswordDto) {
    return this.phasesService.verifyPassword(id, dto.password);
  }

  @Post('guide/:guideId/publish')
  async publish(@Req() req: Request, @Param('guideId') guideId: string) {
    const user = req.user as { id: string };
    const slug = await this.phasesService.generateSlug(guideId, user.id);
    return { slug };
  }

  @Post('guide/:guideId/unpublish')
  async unpublish(@Req() req: Request, @Param('guideId') guideId: string) {
    const user = req.user as { id: string };
    await this.phasesService.unpublish(guideId, user.id);
    return { unpublished: true };
  }
}