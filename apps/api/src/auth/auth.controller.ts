import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from './auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: { email: string; username: string; password: string }) {
    return this.authService.register(body.email, body.username, body.password);
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.authService.getProfile(user.id);
  }
}