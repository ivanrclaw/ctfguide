import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { AuthGuard } from '@nestjs/passport';

interface AuthRequest extends Request {
  user: { id: string };
}

@Controller('live-sessions')
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Post(':guideId/create')
  async createSession(@Req() req: AuthRequest, @Param('guideId') guideId: string) {
    return this.liveSessionsService.createSession(guideId, req.user.id);
  }

  @Get(':id')
  async getSession(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.liveSessionsService.getSession(id, req.user.id);
  }

  @Post(':id/start')
  async startSession(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.liveSessionsService.startSession(id, req.user.id);
  }

  @Post(':id/finish')
  async finishSession(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.liveSessionsService.finishSession(id, req.user.id);
  }

  @Get(':id/stats')
  async getSessionStats(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.liveSessionsService.getSessionStats(id, req.user.id);
  }
}
