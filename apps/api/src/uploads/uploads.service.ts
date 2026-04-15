import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

export const UPLOAD_DIR = '/data/uploads';

@Injectable()
export class UploadsService {
  /**
   * Generate a unique filename preserving the original extension.
   */
  generateFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    return uniqueName;
  }

  /**
   * Ensure the upload directory exists.
   */
  ensureUploadDir(): void {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }
}