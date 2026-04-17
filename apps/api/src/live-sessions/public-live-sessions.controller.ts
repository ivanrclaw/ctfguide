import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { JoinSessionDto, ReconnectSessionDto, SubmitPhaseAnswerDto } from './dto/live-session.dto';
import { Public } from '../auth/auth.decorator';

@Public()
@Controller('public/live-sessions')
export class PublicLiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Get(':code')
  async getSessionByCode(@Param('code') code: string) {
    const session = await this.liveSessionsService.getSessionByCode(code);
    // Return safe version without sensitive data
    return {
      code: session.code,
      status: session.status,
      guide: {
        id: session.guide.id,
        title: session.guide.title,
        ctfName: session.guide.ctfName,
        category: session.guide.category,
        difficulty: session.guide.difficulty,
      },
      phaseCount: session.guide.phases?.length || 0,
    };
  }

  @Post(':code/join')
  async joinSession(
    @Param('code') code: string,
    @Body() dto: JoinSessionDto,
  ) {
    const participant = await this.liveSessionsService.joinSession(code, dto.name);
    return {
      sessionId: participant.sessionId,
      participant: {
        id: participant.id,
        name: participant.name,
        unlockedPhaseIndex: participant.unlockedPhaseIndex,
      },
    };
  }

  @Post(':code/reconnect')
  async reconnectSession(
    @Param('code') code: string,
    @Body() dto: ReconnectSessionDto,
  ) {
    const participant = await this.liveSessionsService.reconnectSession(code, dto.name);
    if (!participant) {
      return { found: false };
    }
    return {
      found: true,
      participant: {
        id: participant.id,
        name: participant.name,
        unlockedPhaseIndex: participant.unlockedPhaseIndex,
        unlockedPhaseIds: participant.unlockedPhaseIds,
      },
    };
  }

  @Post(':code/phase/:phaseId/unlock')
  async submitPhaseAnswer(
    @Param('code') code: string,
    @Param('phaseId') phaseId: string,
    @Body() dto: SubmitPhaseAnswerDto,
  ) {
    const result = await this.liveSessionsService.submitPhaseAnswer(
      code,
      dto.name,
      phaseId,
      dto.password,
      dto.answer,
    );
    return {
      valid: result.valid,
      unlockedPhaseIndex: result.participant.unlockedPhaseIndex,
      unlockedPhaseIds: result.participant.unlockedPhaseIds,
    };
  }

  @Get(':code/progress/:name')
  async getParticipantProgress(
    @Param('code') code: string,
    @Param('name') name: string,
  ) {
    const participant = await this.liveSessionsService.getParticipantProgress(code, name);
    return {
      name: participant.name,
      unlockedPhaseIndex: participant.unlockedPhaseIndex,
      unlockedPhaseIds: participant.unlockedPhaseIds,
      isOnline: participant.isOnline,
    };
  }

  @Get(':code/phases')
  async getSessionPhases(@Param('code') code: string) {
    const session = await this.liveSessionsService.getSessionByCode(code);
    // Return phases without passwords/answers
    const safePhases = (session.guide.phases || [])
      .sort((a, b) => a.order - b.order)
      .map(({ password, answer, ...rest }) => ({
        ...rest,
        hasPassword: rest.unlockType === 'password' && !!password,
        question: rest.unlockType === 'llm' ? rest.question : undefined,
      }));
    return safePhases;
  }
}
