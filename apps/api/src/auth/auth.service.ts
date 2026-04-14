import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, username: string, password: string) {
    // Check if email or username already exists
    const existingUser = await this.usersRepository.findOne({
      where: [{ email }, { username }],
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already exists');
      }
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      username,
      password: hashedPassword,
    });
    await this.usersRepository.save(user);

    const payload = { sub: user.id, email: user.email, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, username: user.username };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
  }
}