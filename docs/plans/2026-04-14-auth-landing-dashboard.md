# CTF Guide - Iteration 2: Auth + Landing + Dashboard

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Implement user registration/login with email+password, a polished landing page, and a dashboard showing the user's guides.

**Architecture:** JWT-based auth on the NestJS backend with bcrypt password hashing. Frontend uses react-router for navigation, a React context for auth state, and shadcn/ui components for forms and layout. Dashboard shows user's guides with CRUD operations.

**Tech Stack:**
- Backend: NestJS 11 + TypeORM + bcrypt + @nestjs/jwt + @nestjs/passport + passport-jwt
- Frontend: React 19 + react-router-dom + shadcn/ui + lucide-react + sonner (toasts)

---

### Task 1: Backend — User entity + Auth module setup

**Objective:** Create the User entity with TypeORM, set up the auth module with bcrypt and JWT infrastructure, and add auth dependencies.

**Files:**
- Create: `apps/api/src/users/user.entity.ts`
- Create: `apps/api/src/users/users.module.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/jwt-auth.guard.ts`
- Create: `apps/api/src/auth/auth.decorator.ts`
- Modify: `apps/api/package.json` — add bcrypt, @nestjs/jwt, @nestjs/passport, passport, passport-jwt, @types/bcrypt, @types/passport-jwt
- Modify: `apps/api/src/app.module.ts` — import UsersModule, AuthModule
- Modify: `packages/shared/src/index.ts` — add RegisterDto, LoginDto, AuthResponse types

**user.entity.ts:**
```ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Guide } from '../guides/guide.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Guide, (guide) => guide.author)
  guides: Guide[];
}
```

**auth.module.ts** imports JwtModule.registerAsync reading JWT_SECRET from ConfigService, PassportModule, UsersModule. JwtModule signs with 24h expiry.

**jwt.strategy.ts:** Extract JWT from Authorization Bearer header, validate by finding user in DB, return { id, email, username }.

**jwt-auth.guard.ts:** Extends AuthGuard('jwt').

**auth.decorator.ts:** Custom @Public() decorator using SetMetadata to skip auth on specific endpoints.

**shared types to add:**
```ts
export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: Pick<User, 'id' | 'email' | 'username'>;
}
```

**Verify:** `cd /home/iruizl/projects/ctfguide && pnpm install && pnpm --filter @ctfguide/api build` succeeds.

---

### Task 2: Backend — Auth endpoints (register, login, me)

**Objective:** Create auth controller and service with register, login, and profile endpoints. Add a global JWT guard with @Public() bypass.

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Modify: `apps/api/src/main.ts` — add `app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)))` after Reflector provider
- Modify: `apps/api/src/app.module.ts` — add APP_GUARD provider for JwtAuthGuard

**auth.service.ts:**
- `register(dto: RegisterDto)`: Hash password with bcrypt (salt rounds 10), save user, return AuthResponse with JWT
- `login(dto: LoginDto)`: Find user by email, compare password with bcrypt, return AuthResponse with JWT. Throw UnauthorizedException on failure.
- `getProfile(userId: string)`: Find user by id, return user without password

**auth.controller.ts:**
- POST /api/auth/register — @Public()
- POST /api/auth/login — @Public()
- GET /api/auth/me — protected, returns current user profile

**Verify:** Build passes. `pnpm --filter @ctfguide/api build` succeeds.

---

### Task 3: Backend — Guide entity + CRUD module

**Objective:** Create the Guide entity and a full CRUD controller/service for guides. Guides belong to a user.

**Files:**
- Create: `apps/api/src/guides/guide.entity.ts`
- Create: `apps/api/src/guides/guides.module.ts`
- Create: `apps/api/src/guides/guides.controller.ts`
- Create: `apps/api/src/guides/guides.service.ts`
- Create: `apps/api/src/guides/dto/create-guide.dto.ts`
- Modify: `apps/api/src/app.module.ts` — import GuidesModule

**guide.entity.ts:**
```ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('guides')
export class Guide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  ctfName: string;

  @Column()
  category: string;

  @Column({ default: 'beginner' })
  difficulty: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User, (user) => user.guides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**guides.service.ts:**
- `create(authorId, dto)`: Create guide with authorId from JWT
- `findAllByUser(authorId)`: Return all guides for a user
- `findOne(id, authorId)`: Return one guide, verify ownership
- `update(id, authorId, dto)`: Update guide, verify ownership
- `remove(id, authorId)`: Delete guide, verify ownership

**guides.controller.ts:**
- POST /api/guides — create guide
- GET /api/guides — list user's guides
- GET /api/guides/:id — get one guide
- PATCH /api/guides/:id — update guide
- DELETE /api/guides/:id — delete guide

All endpoints are protected. Inject `@Req() req` to get `req.user.id` as the authorId.

**create-guide.dto.ts:**
```ts
export class CreateGuideDto {
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty?: string;
}
```

**Verify:** `pnpm --filter @ctfguide/api build` succeeds.

---

### Task 4: Frontend — Router, layouts, auth context, API client

**Objective:** Set up routing, an API client with JWT interceptor, auth context provider, and layout components. Add required packages.

**Files:**
- Create: `apps/web/src/lib/api.ts` — fetch wrapper with JWT auto-attach + base URL from env
- Create: `apps/web/src/contexts/auth-context.tsx` — AuthProvider + useAuth hook
- Create: `apps/web/src/components/layouts/public-layout.tsx` — header + footer for unauthenticated pages
- Create: `apps/web/src/components/layouts/dashboard-layout.tsx` — sidebar/header for authenticated pages
- Modify: `apps/web/package.json` — add react-router-dom, sonner
- Modify: `apps/web/src/main.tsx` — wrap App with BrowserRouter + AuthProvider + Toaster
- Modify: `apps/web/src/App.tsx` — replace with router setup (Routes for /, /login, /register, /dashboard)

**lib/api.ts:**
```ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('ctfguide_token');
  }

  async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }); }
  patch<T>(path: string, body: unknown) { return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }); }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
```

**auth-context.tsx:**
- Stores user + token in state + localStorage
- login(email, password) / register(email, username, password) / logout()
- On mount, if token exists, call GET /auth/me to validate and hydrate user
- Protected route helper: if not authenticated, redirect to /login

**public-layout.tsx:** Renders children between header (with Sign In / Sign Up buttons) and footer.

**dashboard-layout.tsx:** Renders sidebar with nav (My Guides, Create Guide, Sign Out) and main content area. User info in sidebar.

**Verify:** `pnpm --filter @ctfguide/web build` succeeds.

---

### Task 5: Frontend — Landing page with shadcn components

**Objective:** Redesign the landing page as a proper marketing page within the public layout. Use shadcn Card, Button, Badge components. Add more shadcn components as needed (Card, Badge, Input, Label, Separator).

**Files:**
- Create: `apps/web/src/pages/landing.tsx`
- Modify: `apps/web/src/App.tsx` — import Landing page at route /
- Modify: `apps/web/components.json` — ensure style is new-york
- Run: `pnpm dlx shadcn@latest add card badge input label separator` from apps/web

**Landing page sections:**
1. Hero: Large heading "Master the Art of Capture The Flag", subheading, two CTA buttons (Get Started → /register, Browse Guides)
2. Features: 3 cards (Hands-On Challenges, Guided Learning, Community)
3. How It Works: 3 steps with numbered badges (Create Guide → Add Steps → Publish)
4. Categories showcase: Grid of category badges (Web, Pwn, Reverse, Crypto, Forensics, Misc, OSINT)
5. CTA section: Final call to action with gradient background

**Verify:** Landing renders at / with nice UI. Build passes.

---

### Task 6: Frontend — Register + Login pages

**Objective:** Create registration and login forms with proper validation, error handling, and toast notifications.

**Files:**
- Create: `apps/web/src/pages/register.tsx`
- Create: `apps/web/src/pages/login.tsx`
- Modify: `apps/web/src/App.tsx` — add routes /register and /login

**register.tsx:**
- Form with email, username, password fields using shadcn Input + Label
- Client-side validation: email format, username 3+ chars, password 8+ chars
- Submit calls authContext.register()
- On success: redirect to /dashboard with toast "Welcome!"
- Link to login page at bottom
- Display server errors via toast

**login.tsx:**
- Form with email and password fields
- Submit calls authContext.login()
- On success: redirect to /dashboard with toast "Welcome back!"
- Link to register page at bottom
- Display server errors via toast

Both pages use the public layout and have a centered card form layout.

**Verify:** Forms render, validation works, auth flow redirects. Build passes.

---

### Task 7: Frontend — Dashboard with guide list

**Objective:** Create the dashboard page showing the user's guides with create, edit, and delete functionality.

**Files:**
- Create: `apps/web/src/pages/dashboard.tsx`
- Create: `apps/web/src/components/guide-card.tsx`
- Create: `apps/web/src/components/create-guide-dialog.tsx`

**dashboard.tsx:**
- Fetch guides on mount via GET /guides
- Display grid of guide cards
- "New Guide" button opens a dialog
- Empty state when no guides: illustration + "Create your first guide" CTA

**guide-card.tsx:**
- Card component showing: title, ctfName, category badge, difficulty badge, published status
- Actions: Edit (navigate), Delete (with confirmation)
- Color-coded badges by category and difficulty

**create-guide-dialog.tsx:**
- Dialog with form: title, description, ctfName, category (select), difficulty (select)
- Submit calls POST /guides, refreshes list on success
- Toast notifications for success/error

**Add more shadcn components:** dialog, select, textarea

**Verify:** Dashboard shows guides, create dialog works, delete works. Build passes.

---

### Task 8: Final build, commit, and push

**Objective:** Verify full monorepo build, commit all changes, push to GitHub.

**Steps:**
1. `pnpm run build` from root — all packages build clean
2. `git add -A && git commit -m "feat: auth, landing page, dashboard with guide CRUD"`
3. `git push origin main`

**Verify:** GitHub repo has all new code.