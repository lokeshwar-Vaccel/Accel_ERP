import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { uploadQrCode, getFileUrl, deleteFile } from '../middleware/upload';
import { AppError } from '../errors/AppError';

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    email: string;
    role: string;
  };
}

/**
 * Upload QR code image for quotation
 * POST /api/v1/qr-code/upload
 */
export const uploadQrCodeImage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use the upload middleware
    uploadQrCode(req, res, async (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return next(new AppError('File size too large. Maximum size is 5MB.', 400));
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

      // Validate file type
      if (!req.file.mimetype.startsWith('image/')) {
        // Delete the uploaded file if it's not an image
        deleteFile(req.file.filename);
        return next(new AppError('Only image files are allowed', 400));
      }

      // Generate file URL
      const fileUrl = getFileUrl(req.file.filename);

      res.status(200).json({
        success: true,
        message: 'QR code image uploaded successfully',
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl
        }
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete QR code image
 * DELETE /api/v1/qr-code/:filename
 */
export const deleteQrCodeImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return next(new AppError('Filename is required', 400));
    }

    const deleted = deleteFile(filename);

    if (!deleted) {
      return next(new AppError('File not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'QR code image deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get QR code image info
 * GET /api/v1/qr-code/:filename
 */
export const getQrCodeImageInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return next(new AppError('Filename is required', 400));
    }

    const fileUrl = getFileUrl(filename);

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