import { Controller, Get, Post, Param, Body, NotFoundException } from '@nestjs/common';
import { PhasesService } from '../phases/phases.service';
import { VerifyPhaseDto } from '../phases/dto/phase.dto';
import { Public } from '../auth/auth.decorator';

@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly phasesService: PhasesService) {}

  @Get('guide/:slug')
  async getPublicGuide(@Param('slug') slug: string) {
    return this.phasesService.findPublicByGuide(slug);
  }

  @Post('phase/:id/verify')
  async verifyPhase(@Param('id') id: string, @Body() dto: VerifyPhaseDto) {
    return this.phasesService.verify(id, dto.password, dto.answer);
  }
}