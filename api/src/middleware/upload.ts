import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../assets/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure PDF upload directory exists
const pdfUploadDir = path.join(__dirname, '../assets/uploadPdfs');
if (!fs.existsSync(pdfUploadDir)) {
  fs.mkdirSync(pdfUploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Configure PDF storage
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfUploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp for PDFs
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'pdf-' + uniqueSuffix + ext);
  }
});

// Memory storage for Excel/CSV files to ensure buffer is available
const memoryStorage = multer.memoryStorage();

// File filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and common document types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv',
    'text/comma-separated-values',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];

  // Check if file type is explicitly allowed
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  // Special handling for CSV files that might be detected as octet-stream
  if (file.mimetype === 'application/octet-stream' && 
      (file.originalname.endsWith('.csv') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls'))) {
    cb(null, true);
    return;
  }

  // Check file extension as fallback
  const fileExtension = file.originalname.toLowerCase();
  if (fileExtension.endsWith('.csv') || fileExtension.endsWith('.xlsx') || fileExtension.endsWith('.xls')) {
    cb(null, true);
    return;
  }

  cb(new Error(`File type ${file.mimetype} is not allowed`));
};

// PDF file filter
const pdfFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
    return;
  }

  // Check file extension as fallback
  const fileExtension = file.originalname.toLowerCase();
  if (fileExtension.endsWith('.pdf')) {
    cb(null, true);
    return;
  }

  cb(new Error('Only PDF files are allowed'));
};

// Configure multer with disk storage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  }
});

// Configure multer with PDF storage
const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs
    files: 1 // Only 1 PDF file per request
  }
});

// Configure multer with memory storage for Excel/CSV files
const uploadExcel = multer({
  storage: memoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only 1 file for Excel uploads
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for PDF file upload
export const uploadPdfSingle = uploadPdf.single('pdfFile');

// Middleware for Excel/CSV file upload (memory storage)
export const uploadExcelSingle = uploadExcel.single('file');

// Middleware for multiple files upload
export const uploadMultiple = upload.array('files', 10);

// Middleware for specific field uploads
export const uploadFields = upload.fields([
  { name: 'photos', maxCount: 5 },
  { name: 'attachments', maxCount: 5 }
]);

// Middleware for QR code image upload
export const uploadQrCode = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow image files for QR codes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for QR codes'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for QR codes
    files: 1 // Only 1 file per request
  }
}).single('qrCodeImage');

// Helper function to get file URL
export const getFileUrl = (filename: string): string => {
  return `/api/v1/files/${filename}`;
};

// Helper function to get PDF file URL
export const getPdfFileUrl = (filename: string): string => {
  return `/api/v1/files/pdf/${filename}`;
};

// Helper function to delete file
export const deleteFile = (filename: string): void => {
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Helper function to delete PDF file
export const deletePdfFile = (filename: string): void => {
  const filePath = path.join(pdfUploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export default upload; 