import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config, allowedMimeTypes, allowedExtensions } from '../utils/config.js';
import { FileUploadError } from '../utils/errors.js';

const uploadDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `invoice-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new FileUploadError(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG`));
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new FileUploadError(`Invalid file extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
});
