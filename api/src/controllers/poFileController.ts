import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadPdfAndImageSingle, getPdfFileUrl, deletePdfFile } from '../middleware/upload';
import { AppError } from '../errors/AppError';

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
  };
}

/**
 * Upload PDF or image file for PO from customer
 * POST /api/v1/po-files/upload
 */
export const uploadPOFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('PO File Upload - Request headers:', {
      authorization: req.headers.authorization,
      contentType: req.headers['content-type'],
      userAgent: req.headers['user-agent']
    });
    
    // Use the upload middleware
    uploadPdfAndImageSingle(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size too large. Maximum size is 10MB.', 400));
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return next(new AppError('Too many files. Only one file allowed.', 400));
          }
        }
        return next(new AppError(err.message || 'File upload failed', 400));
      }

      if (!req.file) {
        return next(new AppError('No file uploaded', 400));
      }

      // Generate file URL
      const fileUrl = getPdfFileUrl(req.file.filename);

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          path: req.file.path
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete PO file
 * DELETE /api/v1/po-files/:filename
 */
export const deletePOFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return next(new AppError('Filename is required', 400));
    }

    // Check if file exists before deleting
    const filePath = path.join(__dirname, '../assets/uploadPdfs', filename);
    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found', 404));
    }

    // Delete the file
    deletePdfFile(filename);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get PO file info
 * GET /api/v1/po-files/:filename
 */
export const getPOFileInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return next(new AppError('Filename is required', 400));
    }

    const fileUrl = getPdfFileUrl(filename);

    res.status(200).json({
      success: true,
      data: {
        filename,
        url: fileUrl
      }
    });
  } catch (error) {
    next(error);
  }
};
