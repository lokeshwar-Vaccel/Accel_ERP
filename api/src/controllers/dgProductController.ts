import { Request, Response } from 'express';
import { DGProduct } from '../models/DGProduct';
import { createDGProductSchema, updateDGProductSchema, dgProductQuerySchema } from '../schemas/dgProductSchemas';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest } from '../types';
import mongoose from 'mongoose';

// Preview DG products from Excel sheet without importing
export const previewDGProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Debug: Log file information
    console.log('🔍 Preview - File Upload Debug:', {
      hasFile: !!req.file,
      fileSize: req.file.size,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      hasBuffer: !!req.file.buffer,
      hasPath: !!req.file.path
    });

    let fileBuffer: Buffer;
    
    // Handle both buffer and disk storage
    if (req.file.buffer) {
      // File uploaded as buffer (memory storage)
      fileBuffer = req.file.buffer;
    } else if (req.file.path) {
      // File uploaded to disk, read it
      const fs = require('fs');
      fileBuffer = fs.readFileSync(req.file.path);
    } else {
      throw new AppError('Unable to read uploaded file', 400);
    }

    // Validate file buffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new AppError('File buffer is empty or invalid', 400);
    }

    console.log('🔍 Preview - File Buffer Debug:', {
      hasBuffer: !!fileBuffer,
      bufferLength: fileBuffer ? fileBuffer.length : 0,
      bufferType: typeof fileBuffer,
      isBuffer: Buffer.isBuffer(fileBuffer)
    });

    const workbook = require('xlsx').read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Debug: Log workbook information
    console.log('🔍 Preview - Workbook Debug:', {
      sheetNames: workbook.SheetNames,
      selectedSheet: sheetName,
      hasWorksheet: !!worksheet,
      worksheetKeys: worksheet ? Object.keys(worksheet) : []
    });

    const data = require('xlsx').utils.sheet_to_json(worksheet, { header: 1 });

    // Debug: Log parsed data
    console.log('🔍 Preview - Parsed Data Debug:', {
      dataLength: data.length,
      dataType: typeof data,
      isArray: Array.isArray(data),
      firstRow: data[0],
      secondRow: data[1],
      sampleData: data.slice(0, 3)
    });

    if (!data || !Array.isArray(data) || data.length < 2) {
      throw new AppError(
        `Invalid Excel file format. Expected array with at least 2 rows, got: ${JSON.stringify({
          dataType: typeof data,
          isArray: Array.isArray(data),
          length: data ? data.length : 'undefined'
        })}`
      );
    }

    const headers = data[0];
    
    // Debug: Log headers
    console.log('🔍 Preview - Headers Debug:', {
      headers: headers,
      headersType: typeof headers,
      isArray: Array.isArray(headers),
      headersLength: headers ? headers.length : 'undefined',
      firstHeader: headers ? headers[0] : 'undefined'
    });

    if (!headers || !Array.isArray(headers)) {
      throw new AppError(
        `Invalid header row. Expected array of headers, got: ${JSON.stringify({
          headers: headers,
          headersType: typeof headers,
          isArray: Array.isArray(headers)
        })}`
      );
    }

    const rows = data.slice(1);

    // Expected column mapping based on the Google Sheet structure
    const columnMapping = {
      subject: headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('subject')),
      annexureRating: headers.findIndex((h: string) => h && (
        h.toString().toLowerCase().includes('annexure rating') ||
        h.toString().toLowerCase().includes('annexure') ||
        h.toString().toLowerCase().includes('rating') ||
        h.toString().toLowerCase().includes('kva') ||
        h.toString().toLowerCase().includes('power')
      )),
      modelCylinder: headers.findIndex((h: string) => h && (
        (h.toString().toLowerCase().includes('model') && h.toString().toLowerCase().includes('cylinder')) ||
        h.toString().toLowerCase().includes('model & cylinder') ||
        h.toString().toLowerCase().includes('model and cylinder') ||
        h.toString().toLowerCase().includes('engine')
      )),
      productDescription: headers.findIndex((h: string) => h && (
        h.toString().toLowerCase().includes('product description') ||
        h.toString().toLowerCase().includes('description') ||
        h.toString().toLowerCase().includes('details') ||
        h.toString().toLowerCase().includes('specifications')
      ))
    };

    // We don't need separate Model and No Of Cylinders columns since we extract them from Model & Cylinder
    console.log('🔍 Column Mapping Found:', {
      headers: headers,
      columnMapping: columnMapping,
      expectedHeaders: ['Subject', 'Annexure Rating', 'Model & Cylinder', 'Product Description']
    });

    // Validate required columns exist
    const missingColumns = Object.entries(columnMapping)
      .filter(([key, index]) => index === -1)
      .map(([key]) => key);

    if (missingColumns.length > 0) {
      // Provide helpful debugging information
      const foundHeaders = headers.map((h: string) => h || '(empty)').join(', ');
      const missingColumnsList = missingColumns.join(', ');
      
      throw new AppError(
        `Missing required columns: ${missingColumnsList}\n\n` +
        `Found headers: ${foundHeaders}\n\n` +
        `Required headers: Subject, Annexure Rating, Model & Cylinder, Product Description\n\n` +
        `Please ensure your Excel file has these exact column headers in the first row.`
      );
    }

    const previewData = [];
    const validationSummary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      errors: string[];
    } = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      errors: []
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because we start from row 2 (after header)

      // Skip empty rows
      if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
        continue;
      }

      validationSummary.totalRows++;

      // Extract and parse data from each column
      const subject = row[columnMapping.subject]?.toString().trim() || '';
      const annexureRating = row[columnMapping.annexureRating]?.toString().trim() || '';
      const modelCylinder = row[columnMapping.modelCylinder]?.toString().trim() || '';
      const productDescription = row[columnMapping.productDescription]?.toString().trim() || '';

      // Skip rows with missing required fields
      if (!subject || !annexureRating || !modelCylinder) {
        validationSummary.invalidRows++;
        validationSummary.errors.push(`Row ${rowNumber}: Skipped - Missing required fields. Subject: "${subject}", Annexure Rating: "${annexureRating}", Model & Cylinder: "${modelCylinder}"`);
        continue;
      }

      // Parse KVA and Phase from Annexure Rating
      const kvaMatch = annexureRating.match(/(\d+(?:\.\d+)?)\s*kva/i);
      const phaseMatch = annexureRating.match(/(\d+)p/i);
      
      const errors: string[] = [];
      let kva = '';
      let phase = 'single';
      let dgModel = '';
      let numberOfCylinders = 1;
      let isValid = true;

      if (!kvaMatch) {
        errors.push('Invalid KVA format in Annexure Rating');
        isValid = false;
      } else {
        kva = kvaMatch[1];
      }

      if (phaseMatch && phaseMatch[1] === '3') {
        phase = 'three';
      }

      // Parse DG Model and Cylinders from Model & Cylinder column
      const modelMatch = modelCylinder.match(/^([^&]+)/);
      const cylinderMatch = modelCylinder.match(/cyl-(\d+)/i);

      if (!modelMatch) {
        errors.push('Invalid Model format in Model & Cylinder');
        isValid = false;
      } else {
        dgModel = modelMatch[1].trim();
      }

      if (cylinderMatch) {
        numberOfCylinders = parseInt(cylinderMatch[1]);
      }

      // Validate required fields
      if (!subject || !annexureRating || !dgModel) {
        errors.push('Missing required fields (Subject, Annexure Rating, or Model)');
        isValid = false;
      }

      // Check for duplicate products (same KVA, Phase, Model, Cylinders)
      if (isValid) {
        const existingProduct = await DGProduct.findOne({
          kva,
          phase,
          dgModel,
          numberOfCylinders
        });

        if (existingProduct) {
          errors.push('Product already exists with same KVA, Phase, Model, and Cylinders');
          isValid = false;
        }
      }

      if (isValid) {
        validationSummary.validRows++;
      } else {
        validationSummary.invalidRows++;
        validationSummary.errors.push(`Row ${rowNumber}: ${errors.join(', ')}`);
      }

      // Add to preview data - extract model and cylinders from modelCylinder
      const extractedModel = dgModel || 'N/A';
      const extractedCylinders = numberOfCylinders || 'N/A';
      
      previewData.push({
        row: rowNumber,
        subject,
        annexureRating,
        modelCylinder,
        productDescription,
        model: extractedModel,
        noOfCylinders: extractedCylinders.toString(),
        parsedData: {
          kva,
          phase,
          dgModel,
          numberOfCylinders,
          isValid,
          errors
        }
      });
    }

    res.json({
      success: true,
      message: `Preview generated for ${validationSummary.totalRows} rows`,
      data: {
        previewData,
        validationSummary,
        columnMapping: {
          subject: headers[columnMapping.subject] || 'Subject',
          annexureRating: headers[columnMapping.annexureRating] || 'Annexure Rating',
          modelCylinder: headers[columnMapping.modelCylinder] || 'Model & Cylinder',
          productDescription: headers[columnMapping.productDescription] || 'Product Description'
        }
      }
    });

  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to preview DG products'
    });
  }
};

// Import DG products from Excel sheet
export const importDGProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    console.log('🔍 Import - User Info:', {
      userId: req.user.id,
      userEmail: req.user.email,
      hasUser: !!req.user
    });

    // Check database collections for debugging
    try {
      if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const dgCollections = collections.filter(col => col.name.toLowerCase().includes('dg'));
        console.log('🔍 Database Collections:', {
          allCollections: collections.map(col => col.name),
          dgCollections: dgCollections.map(col => col.name),
          expectedCollection: 'dgproducts'
        });

        // Check if we need to drop and recreate the collection
        const dgCollection = mongoose.connection.db.collection('dgproducts');
        if (dgCollection) {
          try {
            // Get collection info to check for indexes
            const collectionInfo = await dgCollection.indexes();
            console.log('🔍 Collection Indexes:', collectionInfo);
            
            // Check if there's a partNo index or any conflicting indexes
            const conflictingIndexes = collectionInfo.filter(index => 
              index.key && (
                Object.keys(index.key).includes('partNo') ||
                Object.keys(index.key).includes('name') ||
                Object.keys(index.key).includes('category')
              )
            );
            
            if (conflictingIndexes.length > 0) {
              console.log('⚠️ Found conflicting indexes:', conflictingIndexes);
              console.log('🔄 Dropping dgproducts collection to recreate with correct schema...');
              
              // Drop the collection to remove conflicting indexes
              await dgCollection.drop();
              console.log('✅ Dropped dgproducts collection');
              
              // Force model recreation
              console.log('🔄 Recreating DGProduct model...');
              try {
                // Delete the model if it exists
                delete mongoose.models.DGProduct;
                console.log('✅ Deleted existing DGProduct model');
                
                // Import the model again to recreate it
                const { DGProduct: NewDGProduct } = await import('../models/DGProduct');
                console.log('✅ Recreated DGProduct model');
                
                // Verify the new model has the correct schema
                const newModelIndexes = await NewDGProduct.collection.indexes();
                console.log('🔍 New Model Indexes:', newModelIndexes);
                
                // Check for any remaining conflicting indexes
                const remainingConflicts = newModelIndexes.filter(index => 
                  index.key && (
                    Object.keys(index.key).includes('partNo') ||
                    Object.keys(index.key).includes('name') ||
                    Object.keys(index.key).includes('category')
                  )
                );
                
                if (remainingConflicts.length > 0) {
                  console.error('❌ Still have conflicting indexes after recreation:', remainingConflicts);
                  throw new AppError('Failed to recreate model with correct schema', 500);
                } else {
                  console.log('✅ Model recreated successfully with correct schema');
                }
              } catch (modelError: any) {
                console.log('ℹ️ No existing model to delete:', modelError.message);
              }
            }
          } catch (dropError: any) {
            console.warn('⚠️ Could not drop collection:', dropError.message);
          }
        }
      }
    } catch (dbError: any) {
      console.warn('⚠️ Could not check collections:', dbError.message);
    }

    const fileBuffer = req.file.buffer;
    const workbook = require('xlsx').read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = require('xlsx').utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      throw new AppError('Excel file must have at least a header row and one data row', 400);
    }

    const headers = data[0];
    const rows = data.slice(1);

    // Expected column mapping based on the Google Sheet structure
    const columnMapping = {
      subject: headers.findIndex((h: string) => h && h.toString().toLowerCase().includes('subject')),
      annexureRating: headers.findIndex((h: string) => h && (
        h.toString().toLowerCase().includes('annexure rating') ||
        h.toString().toLowerCase().includes('annexure') ||
        h.toString().toLowerCase().includes('rating') ||
        h.toString().toLowerCase().includes('kva') ||
        h.toString().toLowerCase().includes('power')
      )),
      modelCylinder: headers.findIndex((h: string) => h && (
        (h.toString().toLowerCase().includes('model') && h.toString().toLowerCase().includes('cylinder')) ||
        h.toString().toLowerCase().includes('model & cylinder') ||
        h.toString().toLowerCase().includes('model and cylinder') ||
        h.toString().toLowerCase().includes('engine')
      )),
      productDescription: headers.findIndex((h: string) => h && (
        h.toString().toLowerCase().includes('product description') ||
        h.toString().toLowerCase().includes('description') ||
        h.toString().toLowerCase().includes('details') ||
        h.toString().toLowerCase().includes('specifications')
      ))
    };

    // We don't need separate Model and No Of Cylinders columns since we extract them from Model & Cylinder
    console.log('🔍 Column Mapping Found:', {
      headers: headers,
      columnMapping: columnMapping,
      expectedHeaders: ['Subject', 'Annexure Rating', 'Model & Cylinder', 'Product Description']
    });

    // Validate required columns exist
    const missingColumns = Object.entries(columnMapping)
      .filter(([key, index]) => index === -1)
      .map(([key]) => key);

    if (missingColumns.length > 0) {
      // Provide helpful debugging information
      const foundHeaders = headers.map((h: string) => h || '(empty)').join(', ');
      const missingColumnsList = missingColumns.join(', ');
      
      throw new AppError(
        `Missing required columns: ${missingColumnsList}\n\n` +
        `Found headers: ${foundHeaders}\n\n` +
        `Required headers: Subject, Annexure Rating, Model & Cylinder, Product Description\n\n` +
        `Please ensure your Excel file has these exact column headers in the first row.`
      );
    }

    const importedProducts = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because we start from row 2 (after header)

      try {
        // Skip empty rows
        if (!row || row.every((cell: any) => !cell || cell.toString().trim() === '')) {
          continue;
        }

        // Extract and parse data from each column
        const subject = row[columnMapping.subject]?.toString().trim() || '';
        const annexureRating = row[columnMapping.annexureRating]?.toString().trim() || '';
        const modelCylinder = row[columnMapping.modelCylinder]?.toString().trim() || '';
        const productDescription = row[columnMapping.productDescription]?.toString().trim() || '';

        // Skip rows with missing required fields
        if (!subject || !annexureRating || !modelCylinder) {
          errors.push(`Row ${rowNumber}: Skipped - Missing required fields. Subject: "${subject}", Annexure Rating: "${annexureRating}", Model & Cylinder: "${modelCylinder}"`);
          continue;
        }

        // Parse KVA and Phase from Annexure Rating
        const kvaMatch = annexureRating.match(/(\d+(?:\.\d+)?)\s*kva/i);
        const phaseMatch = annexureRating.match(/(\d+)p/i);
        
        if (!kvaMatch) {
          errors.push(`Row ${rowNumber}: Invalid KVA format in Annexure Rating: "${annexureRating}". Expected format: "10 Kva (3P)" or "15 kva (1P)"`);
          continue;
        }

        const kva = kvaMatch[1];
        const phase = phaseMatch && phaseMatch[1] === '3' ? 'three' : 'single';

        // Parse DG Model and Cylinders from Model & Cylinder column
        if (!modelCylinder || modelCylinder.trim() === '') {
          errors.push(`Row ${rowNumber}: Model & Cylinder field is empty`);
          continue;
        }

        const modelMatch = modelCylinder.match(/^([^&]+)/);
        const cylinderMatch = modelCylinder.match(/cyl-(\d+)/i);

        if (!modelMatch) {
          errors.push(`Row ${rowNumber}: Invalid Model format in Model & Cylinder: "${modelCylinder}". Expected format: "M2155G1 & CYL-2"`);
          continue;
        }

        const dgModel = modelMatch[1].trim();
        const numberOfCylinders = cylinderMatch ? parseInt(cylinderMatch[1]) : 1;

        // Additional validation for model
        if (!dgModel || dgModel.trim() === '') {
          errors.push(`Row ${rowNumber}: Could not extract model from Model & Cylinder: "${modelCylinder}"`);
          continue;
        }

        // Validate required fields
        if (!subject || !annexureRating || !dgModel) {
          errors.push(`Row ${rowNumber}: Missing required fields (Subject, Annexure Rating, or Model)`);
          continue;
        }

        // Create DG product data
        const productData = {
          description: productDescription || `Supply of ${kva} kVA ${phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${numberOfCylinders} cylinder engine, model ${dgModel}, coupled with ${kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`,
          isActive: true,
          kva,
          phase,
          annexureRating,
          dgModel,
          numberOfCylinders,
          subject,
          createdBy: req.user.id
        };

        // Validate the product data
        const { error } = createDGProductSchema.validate(productData);
        if (error) {
          errors.push(`Row ${rowNumber}: Validation error - ${error.details[0].message}`);
          continue;
        }

        // Check if product already exists (based on unique combination)
        const existingProduct = await DGProduct.findOne({
          kva,
          phase,
          dgModel,
          numberOfCylinders
        });

        if (existingProduct) {
          errors.push(`Row ${rowNumber}: Product already exists with KVA: ${kva}, Phase: ${phase}, Model: ${dgModel}, Cylinders: ${numberOfCylinders}`);
          continue;
        }

        // Create the product
        const newProduct = new DGProduct(productData);
        await newProduct.save();
        
        importedProducts.push({
          row: rowNumber,
          subject,
          kva,
          phase,
          dgModel,
          numberOfCylinders
        });

      } catch (rowError: any) {
        errors.push(`Row ${rowNumber}: ${rowError.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed. ${importedProducts.length} products imported successfully.`,
      data: {
        imported: importedProducts.length,
        errorCount: errors.length,
        importedProducts,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to import DG products'
    });
  }
};

// Get all DG products with pagination, search, and filters
export const getDGProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const { error, value } = dgProductQuerySchema.validate(req.query);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const {
      page = 1,
      limit = 10,
      search = '',
      kva = '',
      phase = '',
      dgModel = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = value;

    // Build query
    const query: any = {};

    // Search functionality
    if (search && search.trim()) {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { annexureRating: { $regex: search, $options: 'i' } },
        { dgModel: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by KVA
    if (kva && kva.trim()) {
      query.kva = { $regex: kva, $options: 'i' };
    }

    // Filter by Phase
    if (phase && phase.trim()) {
      query.phase = phase;
    }

    // Filter by DG Model
    if (dgModel && dgModel.trim()) {
      query.dgModel = { $regex: dgModel, $options: 'i' };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await DGProduct.countDocuments(query);

    // Get active count for statistics
    const activeCount = await DGProduct.countDocuments({ ...query, isActive: true });

    // Get paginated results
    const products = await DGProduct.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'email name')
      .lean();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      message: 'DG Products retrieved successfully',
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNum + 1 : null,
          prevPage: hasPrevPage ? pageNum - 1 : null
        },
        stats: {
          activeCount
        }
      }
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve DG products'
    });
  }
};

// Get DG product by ID
export const getDGProductById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const product = await DGProduct.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!product) {
      throw new AppError('DG Product not found', 404);
    }

    res.json({
      success: true,
      data: product,
      message: 'DG Product retrieved successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve DG product'
    });
  }
};

// Create new DG product
export const createDGProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const { error, value } = createDGProductSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Add createdBy from authenticated user (if not provided in payload)
    if (!value.createdBy) {
      value.createdBy = req.user.id;
    }

    // Validate that the createdBy matches the authenticated user
    if (value.createdBy !== req.user.id) {
      throw new AppError('You can only create products for yourself', 403);
    }

    const product = new DGProduct(value);
    await product.save();

    const populatedProduct = await DGProduct.findById(product._id)
      .populate('createdBy', 'name email')
      .lean();

    res.status(201).json({
      success: true,
      data: populatedProduct,
      message: 'DG Product created successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create DG product'
    });
  }
};

// Update DG product
export const updateDGProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const { error, value } = updateDGProductSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const product = await DGProduct.findByIdAndUpdate(
      req.params.id,
      { ...value },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    if (!product) {
      throw new AppError('DG Product not found', 404);
    }

    res.json({
      success: true,
      data: product,
      message: 'DG Product updated successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update DG product'
    });
  }
};

// Delete DG product
export const deleteDGProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const product = await DGProduct.findByIdAndDelete(req.params.id);

    if (!product) {
      throw new AppError('DG Product not found', 404);
    }

    res.json({
      success: true,
      message: 'DG Product deleted successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete DG product'
    });
  }
};

// Get DG product categories (simplified - no categories needed)
export const getDGProductCategories = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: [],
      message: 'DG Products do not use categories'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch DG product categories'
    });
  }
};

// Get DG product statistics
export const getDGProductStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      throw new AppError('User not authenticated. Please login again.', 401);
    }

    const totalProducts = await DGProduct.countDocuments();
    const activeProducts = await DGProduct.countDocuments({ isActive: true });
    const inactiveProducts = await DGProduct.countDocuments({ isActive: false });

    res.json({
      success: true,
      data: {
        total: totalProducts,
        active: activeProducts,
        inactive: inactiveProducts
      },
      message: 'DG Product statistics retrieved successfully'
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to retrieve DG product statistics'
    });
  }
}; 