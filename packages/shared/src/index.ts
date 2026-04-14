// CTF Guide - Shared Types

export interface HealthCheckResponse {
  status: 'ok' | 'error'
  timestamp: string
}

export interface User {
  id: string
  email: string
  username: string
  createdAt: string
  updatedAt: string
}

export interface RegisterDto {
  email: string
  username: string
  password: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: Pick<User, 'id' | 'email' | 'username'>
}

export interface CtfGuide {
  id: string
  title: string
  description: string
  ctfName: string
  category: GuideCategory
  difficulty: Difficulty
  authorId: string
  published: boolean
  createdAt: string
  updatedAt: string
}

export type GuideCategory =
  | 'web'
  | 'pwn'
  | 'reverse'
  | 'crypto'
  | 'forensics'
  | 'misc'
  | 'osint'

export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'insane'

export interface GuideStep {
  id: string
  guideId: string
  order: number
  title: string
  content: string
  hint: string
}

export interface CreateGuideDto {
  title: string
  description: string
  ctfName: string
  category: GuideCategory
  difficulty?: Difficulty
}