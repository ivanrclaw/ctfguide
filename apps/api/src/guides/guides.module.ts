import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guide } from './guide.entity';
import { GuidesService } from './guides.service';
import { GuidesController } from './guides.controller';
import { InvitationsModule } from '../invitations/invitations.module';
import { PdfModule } from './pdf.module';
import { PdfService } from './pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guide]), InvitationsModule, PdfModule],
  controllers: [GuidesController],
  providers: [GuidesService, PdfService],
  exports: [GuidesService],
})
export class GuidesModule {}