import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guide } from './guide.entity';
import { GuidesService } from './guides.service';
import { GuidesController } from './guides.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Guide])],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}