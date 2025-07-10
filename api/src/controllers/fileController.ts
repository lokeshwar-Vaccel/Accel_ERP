import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

// File metadata interface
interface FileMetadata {
  id: string;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  category?: string;
  relatedEntity?: {
    type: 'ticket' | 'customer' | 'amc' | 'purchase_order' | 'user';
    id: string;
  };
  isPublic: boolean;
  tags?: string[];
}

// In-memory file metadata store (in production, use MongoDB)
const fileMetadataStore = new Map<string, FileMetadata>();

// @desc    Upload single file
// @route   POST /api/v1/files/upload
// @access  Private
export const uploadSingleFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const fileId = crypto.randomUUID();
    const metadata: FileMetadata = {
      id: fileId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user!.id,
      uploadedAt: new Date(),
      category: req.body.category,
      relatedEntity: req.body.relatedEntity ? JSON.parse(req.body.relatedEntity) : undefined,
      isPublic: req.body.isPublic === 'true',
      tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : []
    };

    fileMetadataStore.set(fileId, metadata);

    const response: APIResponse = {
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileId,
        originalName: metadata.originalName,
        filename: metadata.filename,
        size: metadata.size,
        mimetype: metadata.mimetype,
        uploadedAt: metadata.uploadedAt,
        downloadUrl: `/api/v1/files/${fileId}/download`
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload multiple files
// @route   POST /api/v1/files/upload-multiple
// @access  Private
export const uploadMultipleFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return next(new AppError('No files uploaded', 400));
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      const fileId = crypto.randomUUID();
      const metadata: FileMetadata = {
        id: fileId,
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: req.user!.id,
        uploadedAt: new Date(),
        category: req.body.category,
        relatedEntity: req.body.relatedEntity ? JSON.parse(req.body.relatedEntity) : undefined,
        isPublic: req.body.isPublic === 'true',
        tags: req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : []
      };

      fileMetadataStore.set(fileId, metadata);

      uploadedFiles.push({
        fileId,
        originalName: metadata.originalName,
        filename: metadata.filename,
        size: metadata.size,
        mimetype: metadata.mimetype,
        downloadUrl: `/api/v1/files/${fileId}/download`
      });
    }

    const response: APIResponse = {
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      data: { files: uploadedFiles }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Download file
// @route   GET /api/v1/files/:fileId/download
// @access  Private/Public (depending on file settings)
export const downloadFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileId } = req.params;
    const metadata = fileMetadataStore.get(fileId);

    if (!metadata) {
      return next(new AppError('File not found', 404));
    }

    // Check permissions for private files
    if (!metadata.isPublic && (!req.user || req.user.id !== metadata.uploadedBy)) {
      return next(new AppError('Access denied', 403));
    }

    // Check if file exists on disk
    try {
      await fs.access(metadata.path);
    } catch {
      return next(new AppError('File not found on disk', 404));
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    res.setHeader('Content-Type', metadata.mimetype);

    // Send file
    res.sendFile(path.resolve(metadata.path));
  } catch (error) {
    next(error);
  }
};

// @desc    Get file metadata
// @route   GET /api/v1/files/:fileId
// @access  Private
export const getFileMetadata = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileId } = req.params;
    const metadata = fileMetadataStore.get(fileId);

    if (!metadata) {
      return next(new AppError('File not found', 404));
    }

    // Check permissions for private files
    if (!metadata.isPublic && req.user!.id !== metadata.uploadedBy) {
      return next(new AppError('Access denied', 403));
    }

    const response: APIResponse = {
      success: true,
      message: 'File metadata retrieved successfully',
      data: metadata
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    List files
// @route   GET /api/v1/files
// @access  Private
export const listFiles = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      category, 
      relatedEntityType, 
      relatedEntityId, 
      isPublic,
      page = 1, 
      limit = 20 
    } = req.query;

    let files = Array.from(fileMetadataStore.values());

    // Filter by user access
    files = files.filter(file => 
      file.isPublic || file.uploadedBy === req.user!.id
    );

    // Apply filters
    if (category) {
      files = files.filter(file => file.category === category);
    }

    if (relatedEntityType && relatedEntityId) {
      files = files.filter(file => 
        file.relatedEntity?.type === relatedEntityType && 
        file.relatedEntity?.id === relatedEntityId
      );
    }

    if (isPublic !== undefined) {
      files = files.filter(file => file.isPublic === (isPublic === 'true'));
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    // Pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedFiles = files.slice(startIndex, endIndex);

    const response: APIResponse = {
      success: true,
      message: 'Files retrieved successfully',
      data: { files: paginatedFiles },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: files.length,
        pages: Math.ceil(files.length / Number(limit))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/v1/files/:fileId
// @access  Private
export const deleteFile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileId } = req.params;
    const metadata = fileMetadataStore.get(fileId);

    if (!metadata) {
      return next(new AppError('File not found', 404));
    }

    // Check permissions
    if (metadata.uploadedBy !== req.user!.id) {
      return next(new AppError('Access denied', 403));
    }

    // Delete file from disk
    try {
      await fs.unlink(metadata.path);
    } catch (error) {
      console.error('File not found on disk, removing from metadata store');
    }

    // Remove from metadata store
    fileMetadataStore.delete(fileId);

    const response: APIResponse = {
      success: true,
      message: 'File deleted successfully',
      data: { fileId }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload signature image
// @route   POST /api/v1/files/signature
// @access  Private
export const uploadSignature = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { signatureData, relatedEntity } = req.body;

    if (!signatureData) {
      return next(new AppError('Signature data is required', 400));
    }

    // Decode base64 signature
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create unique filename
    const filename = `signature-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadsDir, filename);

    // Ensure uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Save signature to disk
    await fs.writeFile(filePath, buffer);

    const fileId = crypto.randomUUID();
    const metadata: FileMetadata = {
      id: fileId,
      originalName: 'digital_signature.png',
      filename,
      path: filePath,
      mimetype: 'image/png',
      size: buffer.length,
      uploadedBy: req.user!.id,
      uploadedAt: new Date(),
      category: 'signature',
      relatedEntity: relatedEntity ? JSON.parse(relatedEntity) : undefined,
      isPublic: false
    };

    fileMetadataStore.set(fileId, metadata);

    const response: APIResponse = {
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        fileId,
        filename: metadata.filename,
        downloadUrl: `/api/v1/files/${fileId}/download`
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get file statistics
// @route   GET /api/v1/files/stats
// @access  Private
export const getFileStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userFiles = Array.from(fileMetadataStore.values())
      .filter(file => file.uploadedBy === req.user!.id);

    const totalFiles = userFiles.length;
    const totalSize = userFiles.reduce((acc, file) => acc + file.size, 0);

    // Group by category
    const categoryBreakdown = userFiles.reduce((acc: any, file) => {
      const category = file.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, size: 0 };
      }
      acc[category].count += 1;
      acc[category].size += file.size;
      return acc;
    }, {});

    // Group by file type
    const typeBreakdown = userFiles.reduce((acc: any, file) => {
      const type = file.mimetype.split('/')[0];
      if (!acc[type]) {
        acc[type] = { count: 0, size: 0 };
      }
      acc[type].count += 1;
      acc[type].size += file.size;
      return acc;
    }, {});

    const response: APIResponse = {
      success: true,
      message: 'File statistics retrieved successfully',
      data: {
        totalFiles,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        categoryBreakdown,
        typeBreakdown
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 