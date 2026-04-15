import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for the web frontend
  app.enableCors();

  // Serve uploaded files publicly at /uploads/ (before global prefix)
  app.useStaticAssets('/data/uploads', { prefix: '/uploads/' });

  // Set global prefix for API routes
  app.setGlobalPrefix('api');

  // Enable validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Serve static frontend files in production
  if (process.env.NODE_ENV === 'production') {
    const clientPath = join(__dirname, '..', 'client');

    if (fs.existsSync(join(clientPath, 'index.html'))) {
      console.log(`Serving frontend from: ${clientPath}`);

      app.useStaticAssets(clientPath);

      app.use((req: any, res: any, next: any) => {
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

  await app.listen(port, '0.0.0.0');
  console.log(`CTF Guide running on: http://0.0.0.0:${port}`);
}
bootstrap();