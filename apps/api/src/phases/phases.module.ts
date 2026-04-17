import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Phase } from './phase.entity';
import { Guide } from '../guides/guide.entity';
import { PhasesController } from './phases.controller';
import { PhasesService } from './phases.service';
import { LlmVerifyService } from './llm-verify.service';
import { LlmRewriteService } from './llm-rewrite.service';
import { InvitationsModule } from '../invitations/invitations.module';

@Module({
  imports: [TypeOrmModule.forFeature([Phase, Guide]), InvitationsModule],
  controllers: [PhasesController],
  providers: [PhasesService, LlmVerifyService, LlmRewriteService],
  exports: [PhasesService],
})
export class PhasesModule {}