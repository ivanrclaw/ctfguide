import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { GuidesService } from './guides.service';
import { CreateGuideDto, UpdateGuideDto } from './dto/create-guide.dto';

@Controller('guides')
export class GuidesController {
  constructor(private readonly guidesService: GuidesService) {}

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

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as { id: string };
    return this.guidesService.findOne(id, user.id);
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
}