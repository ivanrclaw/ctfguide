import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for the web frontend
  app.enableCors();

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Serve static frontend files in production
  if (process.env.NODE_ENV === 'production') {
    const clientPath = join(__dirname, '..', 'client');

    // Serve static files (JS, CSS, images, etc.)
    app.useStaticAssets(clientPath);

    // SPA fallback: serve index.html for non-API routes
    app.use((req: any, res: any, next: any) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(join(clientPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Listen on all interfaces for Fly.io
  await app.listen(port, '0.0.0.0');
  console.log(`CTF Guide running on: http://0.0.0.0:${port}`);
}
bootstrap();