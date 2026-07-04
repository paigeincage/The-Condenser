import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// On Railway, attach a volume and set UPLOADS_DIR to its mount path (e.g. /data/uploads)
// so uploaded files survive redeploys. Falls back to a local folder otherwise.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

function sanitizeDirName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '_').substring(0, 100) || 'unknown';
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    // Organize files into folders by project address (set by the upload route)
    const projectFolder = req.body?.projectFolder || '';
    const dir = projectFolder
      ? path.join(UPLOADS_DIR, sanitizeDirName(projectFolder))
      : UPLOADS_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    // Keep original name but prefix with short UUID to avoid collisions
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[<>:"/\\|?*]/g, '-');
    cb(null, `${base}_${randomUUID().slice(0, 8)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

export { UPLOADS_DIR };
