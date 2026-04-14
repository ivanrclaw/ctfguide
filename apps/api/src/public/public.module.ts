import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PhasesModule } from '../phases/phases.module';

@Module({
  imports: [PhasesModule],
  controllers: [PublicController],
})
export class PublicModule {}