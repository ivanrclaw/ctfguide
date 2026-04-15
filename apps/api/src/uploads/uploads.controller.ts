import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { UPLOAD_DIR } from './uploads.service';

const ALLOWED_MIMETYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Controller('uploads')
export class UploadsController {
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIMETYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname).toLowerCase();
          const uniqueName = `${uuidv4()}${ext}`;
          cb(null, uniqueName);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return {
      url: `/uploads/${file.filename}`,
    };
  }
}