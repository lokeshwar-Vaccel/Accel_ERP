import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { uploadSingle, uploadMultiple, uploadFields, getFileUrl, deleteFile } from '../middleware/upload';

// @desc    Upload single file
// @route   POST /api/v1/files/upload
// @access  Private
export const uploadFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const fileUrl = getFileUrl(req.file.filename);

    const response: APIResponse = {
      success: true,
      message: 'File uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl
      }
    };

    res.status(200).json(response);
  });
};

// @desc    Upload multiple files
// @route   POST /api/v1/files/upload-multiple
// @access  Private
export const uploadMultipleFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }

    if (!req.files || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const files = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.filename)
    }));

    const response: APIResponse = {
      success: true,
      message: 'Files uploaded successfully',
      data: { files }
    };

    res.status(200).json(response);
  });
};

// @desc    Upload files for digital service report
// @route   POST /api/v1/files/upload-digital-report
// @access  Private
export const uploadDigitalReportFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  uploadFields(req, res, (err) => {
    if (err) {
      return next(new AppError(err.message, 400));
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result: { photos?: any[], attachments?: any[] } = {};

    if (files.photos) {
      result.photos = files.photos.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: getFileUrl(file.filename)
      }));
    }

    if (files.attachments) {
      result.attachments = files.attachments.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: getFileUrl(file.filename)
      }));
    }

    const response: APIResponse = {
      success: true,
      message: 'Files uploaded successfully',
      data: result
    };

    res.status(200).json(response);
  });
};

  // @desc    Serve uploaded file
  // @route   GET /api/v1/files/:filename
  // @access  Public
  export const serveFile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../assets/uploads', filename);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found', 404));
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/v1/files/:filename
// @access  Private
export const deleteFileController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { filename } = req.params;
    
    if (deleteFile(filename)) {
      const response: APIResponse = {
        success: true,
        message: 'File deleted successfully',
        data: { filename }
      };
      res.status(200).json(response);
    } else {
      return next(new AppError('File not found', 404));
    }
  } catch (error) {
    next(error);
  }
};

  // @desc    Get file info
  // @route   GET /api/v1/files/info/:filename
  // @access  Private
  export const getFileInfo = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../assets/uploads', filename);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found', 404));
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const fileInfo = {
      filename,
      originalName: filename,
      size: stats.size,
      mimetype: mimeTypes[ext] || 'application/octet-stream',
      url: getFileUrl(filename),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };

    const response: APIResponse = {
      success: true,
      message: 'File info retrieved successfully',
      data: fileInfo
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 