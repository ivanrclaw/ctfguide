import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for the web frontend
  app.enableCors();

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Serve static frontend files in production
  if (process.env.NODE_ENV === 'production') {
    // client/ is at the same level as dist/ in the deployed structure
    // dist/main.js -> ../client/index.html
    const clientPath = join(__dirname, '..', 'client');

    // Verify client files exist
    if (fs.existsSync(join(clientPath, 'index.html'))) {
      console.log(`Serving frontend from: ${clientPath}`);

      // Serve static files (JS, CSS, images, etc.)
      app.useStaticAssets(clientPath);

      // SPA fallback: serve index.html for non-API, non-static routes
      app.use((req: any, res: any, next: any) => {
        // Only serve index.html for non-API, non-file-extension routes
        if (!req.path.startsWith('/api/') && !req.path.match(/\.\w+$/)) {
          res.sendFile(join(clientPath, 'index.html'));
        } else {
          next();
        }
      });
    } else {
      console.warn(`Client files not found at ${clientPath}, frontend will not be served`);
    }
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Listen on all interfaces for Fly.io
  await app.listen(port, '0.0.0.0');
  console.log(`CTF Guide running on: http://0.0.0.0:${port}`);
}
bootstrap();