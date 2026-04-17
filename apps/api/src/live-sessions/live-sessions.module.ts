import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveSession } from './live-session.entity';
import { LiveSessionParticipant } from './live-session-participant.entity';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsController } from './live-sessions.controller';
import { PublicLiveSessionsController } from './public-live-sessions.controller';
import { LiveSessionGateway } from './live-session.gateway';
import { Guide } from '../guides/guide.entity';
import { Phase } from '../phases/phase.entity';
import { PhasesModule } from '../phases/phases.module';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveSession, LiveSessionParticipant, Guide, Phase]),
    PhasesModule,
    InvitationsModule,
  ],
  controllers: [LiveSessionsController, PublicLiveSessionsController],
  providers: [LiveSessionsService, LiveSessionGateway],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
