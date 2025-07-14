import { Response, NextFunction } from 'express';
import { Product } from '../models/Product';
import { Stock, StockLocation, Room, Rack } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, ProductCategory } from '../types';
import { AppError } from '../middleware/errorHandler';
import { InventoryImportInput, InventoryImportPreview, InventoryImportResult } from '../schemas/inventorySchemas';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';

// Helper function to map department to product category
const getDepartmentCategory = (dept: string): ProductCategory => {
  const deptLower = dept.toLowerCase();
  if (deptLower.includes('retail') || deptLower.includes('ret')) {
    return ProductCategory.GENSET;
  } else if (deptLower.includes('telecom') || deptLower.includes('tel')) {
    return ProductCategory.ACCESSORY;
  } else if (deptLower.includes('ie') || deptLower.includes('industrial')) {
    return ProductCategory.SPARE_PART;
  }
  return ProductCategory.SPARE_PART; // Default category
};

// Helper function to get or create default location/room/rack
const getOrCreateLocationHierarchy = async (locationName: string = 'Main Office', roomName?: string, rackName?: string) => {
  try {
    console.log(`🏢 Creating location hierarchy: Location="${locationName}", Room="${roomName}", Rack="${rackName}"`);
    
    // Find or create location
    let location = await StockLocation.findOne({ name: locationName });
    if (!location) {
      console.log(`📍 Creating new location: ${locationName}`);
      location = await StockLocation.create({
        name: locationName,
        address: 'Main Office - Inventory Location',
        type: 'main_office',
        contactPerson: 'Inventory Manager',
        isActive: true
      });
    }

    let roomId = null;
    let rackId = null;

    // Create or find room if specified
    if (roomName && roomName.trim()) {
      let room = await Room.findOne({ 
        name: roomName.trim(), 
        location: location._id 
      });
      
      if (!room) {
        console.log(`🏠 Creating new room: ${roomName} in ${locationName}`);
        room = await Room.create({
          name: roomName.trim(),
          location: location._id,
          description: `Room in ${locationName}`,
          isActive: true
        });
      }
      roomId = room._id;

      // Create or find rack if specified and room exists
      if (rackName && rackName.trim()) {
        let rack = await Rack.findOne({ 
          name: rackName.trim(), 
          location: location._id,
          room: roomId
        });
        
        if (!rack) {
          console.log(`📦 Creating new rack: ${rackName} in room ${roomName}`);
          rack = await Rack.create({
            name: rackName.trim(),
            location: location._id,
            room: roomId,
            description: `Rack in ${roomName}, ${locationName}`,
            isActive: true
          });
        }
        rackId = rack._id;
      }
    }

    console.log(`✅ Location hierarchy ready: Location=${location._id}, Room=${roomId}, Rack=${rackId}`);
    
    return {
      locationId: location._id,
      roomId: roomId,
      rackId: rackId
    };
  } catch (error) {
    console.error('❌ Error getting/creating location hierarchy:', error);
    throw new Error('Could not create location hierarchy');
  }
};

// @desc    Preview inventory import from Excel/CSV before processing
// @route   POST /api/v1/inventory/preview-import
// @access  Private
export const previewInventoryImport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Find the header row by looking for 'PART NO' column
    let headerRow = 0;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
    
    for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // Column B (where PART NO should be)
      const cell = worksheet[cellAddress];
      if (cell && cell.v && String(cell.v).includes('PART NO')) {
        headerRow = row;
        break;
      }
    }
    
    if (headerRow === 0) {
      headerRow = 4; // Default to row 5 in Excel (0-indexed)
    }
    
    // Parse data starting from the header row
    const rawData: InventoryImportInput[] = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow // Start parsing from the header row
    });

    if (!rawData.length) {
      return next(new AppError('No data found in file', 400));
    }

    const preview: InventoryImportPreview = {
      totalRows: rawData.length,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      productsToCreate: [],
      stocksToCreate: [],
      existingProducts: []
    };

    const sampleData: any[] = [];
    let newProductsCount = 0;
    let stockUpdatesCount = 0;

    // Validate and process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number (accounting for header)

      try {
        // Basic validation - handle potential column name variations
        const partNo = (row as any)['PART NO'] || (row as any)['Part No'] || (row as any)['PartNo'] || (row as any)['partNo'];
        const description = (row as any)['DESCRIPTION'] || (row as any)['Description'] || (row as any)['description'];
        let uom = (row as any)['UOM'] || (row as any)['Uom'] || (row as any)['uom'];
        
        // Convert UOM variations to standard format
        if (uom && typeof uom === 'string') {
          uom = uom.toLowerCase().trim();
          // Convert common variations
          if (uom === 'nos' || uom === 'no' || uom === 'number' || uom === 'num') {
            uom = 'nos';
          }
        }
        
        // Handle DEPT column - it might be missing, so provide fallbacks
        let dept = (row as any)['DEPT'] || (row as any)['Dept'] || (row as any)['dept'] || (row as any)['Department'];
        
        // If DEPT is still missing, try to infer from other patterns or use default
        if (!dept) {
          // Look for any column that might contain department info
          const possibleDeptColumns = Object.keys(row).filter(key => 
            key.toLowerCase().includes('dept') || 
            key.toLowerCase().includes('department') ||
            key.toLowerCase().includes('category')
          );
          
          if (possibleDeptColumns.length > 0) {
            dept = (row as any)[possibleDeptColumns[0]];
            console.log(`🔍 Row ${rowNum} - Using column "${possibleDeptColumns[0]}" for DEPT: "${dept}"`);
          } else {
            // Use a default department based on the description or other fields
            const desc = description?.toLowerCase() || '';
            if (desc.includes('telecom') || desc.includes('tel')) {
              dept = 'TELECOM';
            } else if (desc.includes('retail') || desc.includes('genset')) {
              dept = 'RETAIL';
            } else if (desc.includes('ie') || desc.includes('industrial')) {
              dept = 'IE';
            } else {
              dept = 'GENERAL'; // Default fallback
            }
            console.log(`🔍 Row ${rowNum} - DEPT column missing, inferred from description: "${dept}"`);
          }
        }
        
        // Only require the core essential fields now
        if (!partNo || !description || !uom) {
          console.warn(`⚠️ Preview Row ${rowNum}: Missing essential fields`);
          console.warn(`⚠️ Available columns:`, Object.keys(row));
          console.warn(`⚠️ Field values: PART NO: "${partNo}", DESCRIPTION: "${description}", UOM: "${uom}", DEPT: "${dept}"`);
          preview.errors.push(`Row ${rowNum}: Missing essential fields (PART NO, DESCRIPTION, UOM) - Available columns: ${Object.keys(row).join(', ')}`);
          preview.invalidRows++;
          continue;
        }

        // Convert and validate numeric fields
        const qty = typeof row.QTY === 'number' ? row.QTY : parseFloat(String(row.QTY || 0));
        const gndp = typeof row.GNDP === 'number' ? row.GNDP : parseFloat(String(row.GNDP || 0));
        const mrp = typeof row.MRP === 'number' ? row.MRP : parseFloat(String(row.MRP || 0));

        if (isNaN(qty) || qty < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid quantity "${row.QTY}" - must be a positive number`);
          preview.invalidRows++;
          continue;
        }

        if (isNaN(gndp) || gndp < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid GNDP price "${row.GNDP}" - must be a positive number`);
          preview.invalidRows++;
          continue;
        }

        if (isNaN(mrp) || mrp < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid MRP "${row.MRP}" - must be a positive number`);
          preview.invalidRows++;
          continue;
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({ partNo: row['PART NO'] });
        let itemStatus = 'new';

        if (existingProduct) {
          itemStatus = 'existing';
          preview.existingProducts.push({
            partNo: row['PART NO'],
            name: existingProduct.name,
            currentStock: await Stock.findOne({ product: existingProduct._id }),
            newQuantity: row.QTY
          });
        } else {
          newProductsCount++;
          preview.productsToCreate.push({
            partNo: partNo,
            name: description,
            dept: dept,
            category: getDepartmentCategory(dept),
            quantity: qty,
            gndp: gndp,
            mrp: mrp,
            uom: uom,
            hsnCode: row['HSN CODE'],
            gst: row.GST,
            cpcbNo: row['CPCB Norms']
          });
        }

        stockUpdatesCount++;
        const roomName = row.ROOM || (row as any)['Room'] || (row as any)['room'];
        const rackName = row.RACK || (row as any)['Rack'] || (row as any)['rack'];
        
        preview.stocksToCreate.push({
          partNo: partNo,
          quantity: qty,
          location: 'Main Office',
          room: roomName,
          rack: rackName
        });

        // Add to sample data (first 10 rows)
        if (sampleData.length < 10) {
          sampleData.push({
            ...row,
            status: itemStatus
          });
        }

        preview.validRows++;
      } catch (error: any) {
        preview.errors.push(`Row ${rowNum}: ${error.message}`);
        preview.invalidRows++;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Import preview generated successfully',
      data: {
        summary: {
          totalRows: preview.totalRows,
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          newProducts: newProductsCount,
          stockUpdates: stockUpdatesCount,
          existingProducts: preview.existingProducts.length
        },
        errors: preview.errors,
        sample: sampleData,
        productsToCreate: preview.productsToCreate,
        stocksToCreate: preview.stocksToCreate,
        existingProducts: preview.existingProducts
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Import inventory from Excel/CSV
// @route   POST /api/v1/inventory/import
// @access  Private
export const importInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('🚀 Starting inventory import process...');
  console.log('👤 User:', req.user?.email);
  console.log('📁 File info:', {
    originalname: req.file?.originalname,
    mimetype: req.file?.mimetype,
    size: req.file?.size
  });

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return next(new AppError('No file uploaded', 400));
    }

    console.log('📊 Parsing Excel/CSV file...');
    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer);
    console.log('📋 Sheet names:', workbook.SheetNames);
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Find the header row by looking for 'PART NO' column
    let headerRow = 0;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
    
    console.log('🔍 Searching for header row...');
    for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // Column B (where PART NO should be)
      const cell = worksheet[cellAddress];
      if (cell && cell.v && String(cell.v).includes('PART NO')) {
        headerRow = row;
        console.log(`✅ Found header row at row ${row + 1} (Excel row ${row + 2})`);
        break;
      }
    }
    
    if (headerRow === 0) {
      console.log('⚠️ Header row not found, trying row 4 (Excel row 5) as default');
      headerRow = 4; // Row 5 in Excel (0-indexed)
    }
    
    // Parse data starting from the header row
    const rawData: InventoryImportInput[] = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow // Start parsing from the header row
    });

    console.log('📝 Raw data rows found:', rawData.length);
    if (rawData.length > 0) {
      console.log('📝 Sample first row:', rawData[0]);
      console.log('📝 Available columns:', Object.keys(rawData[0]));
      console.log('📝 Column details:');
      Object.keys(rawData[0]).forEach(key => {
        console.log(`  - "${key}" (length: ${key.length}, type: ${typeof key})`);
      });
      
      // Check specifically for the required fields
      console.log('📝 Required field checks:');
      console.log(`  - 'PART NO' exists: ${!!rawData[0]['PART NO']}, value: "${rawData[0]['PART NO']}"`);
      console.log(`  - 'DESCRIPTION' exists: ${!!rawData[0]['DESCRIPTION']}, value: "${rawData[0]['DESCRIPTION']}"`);
      console.log(`  - 'UOM' exists: ${!!rawData[0]['UOM']}, value: "${rawData[0]['UOM']}"`);
      console.log(`  - 'DEPT' exists: ${!!rawData[0]['DEPT']}, value: "${rawData[0]['DEPT']}"`);
    }

    if (!rawData.length) {
      console.error('❌ No data found in file');
      return next(new AppError('No data found in file', 400));
    }

    const result: InventoryImportResult = {
      successful: 0,
      failed: 0,
      errors: [],
      createdProducts: [],
      createdStocks: [],
      updatedProducts: [],
      updatedStocks: []
    };

    console.log('🔄 Starting to process rows...');
    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number

      console.log(`🔍 Processing row ${rowNum}:`, {
        'PART NO': row['PART NO'],
        'DESCRIPTION': row.DESCRIPTION,
        'UOM': row.UOM,
        'DEPT': row.DEPT,
        'QTY': row.QTY,
        'MRP': row.MRP,
        'GNDP': row.GNDP
      });

      try {
        // Basic validation - handle potential column name variations
        const partNo = row['PART NO'];
        const description = row['DESCRIPTION'];
        let uom = row['UOM'];
        let dept = row['DEPT'] || (row as any)['Dept'] || (row as any)['dept'] || (row as any)['Department'];
        
        // Convert UOM variations to standard format
        if (uom && typeof uom === 'string') {
          uom = uom.toLowerCase().trim();
          // Convert common variations
          if (uom === 'nos' || uom === 'no' || uom === 'number' || uom === 'num') {
            uom = 'nos';
          }
        }
        
        // Convert numeric fields
        const qty = typeof row.QTY === 'number' ? row.QTY : parseFloat(String(row.QTY || 0));
        const gndp = typeof row.GNDP === 'number' ? row.GNDP : parseFloat(String(row.GNDP || 0));
        const mrp = typeof row.MRP === 'number' ? row.MRP : parseFloat(String(row.MRP || 0));
        const gst = typeof row.GST === 'number' ? row.GST : parseFloat(String(row.GST || 0));
        
        console.log(`🔍 Row ${rowNum} field values:`, {
          'PART NO': partNo,
          'DESCRIPTION': description,
          'UOM': uom,
          'DEPT': dept
        });
        
        // Handle DEPT column - provide fallback if missing
        if (!dept) {
          const desc = description?.toLowerCase() || '';
          if (desc.includes('telecom') || desc.includes('tel')) {
            dept = 'TELECOM';
          } else if (desc.includes('retail') || desc.includes('genset')) {
            dept = 'RETAIL';
          } else if (desc.includes('ie') || desc.includes('industrial')) {
            dept = 'IE';
          } else {
            dept = 'GENERAL';
          }
          console.log(`🔍 Row ${rowNum}: DEPT missing, inferred "${dept}" from description`);
        }
        
        if (!partNo || !description || !uom) {
          const errorMsg = `Row ${rowNum}: Missing essential fields - PART NO: "${partNo}", DESCRIPTION: "${description}", UOM: "${uom}"`;
          console.warn(`⚠️ ${errorMsg}`);
          console.warn(`⚠️ Row ${rowNum}: Available keys:`, Object.keys(row));
          console.warn(`⚠️ Row ${rowNum}: All values:`, row);
          result.errors.push(errorMsg);
          result.failed++;
          continue;
        }

        // Additional validation logging
        if (isNaN(qty) || qty < 0) {
          const errorMsg = `Row ${rowNum}: Invalid quantity "${row.QTY}" (type: ${typeof row.QTY}) - must be a positive number`;
          console.warn(`⚠️ ${errorMsg}`);
          result.errors.push(errorMsg);
          result.failed++;
          continue;
        }

        if (isNaN(gndp) || gndp < 0) {
          const errorMsg = `Row ${rowNum}: Invalid GNDP "${row.GNDP}" (type: ${typeof row.GNDP}) - must be a positive number`;
          console.warn(`⚠️ ${errorMsg}`);
          result.errors.push(errorMsg);
          result.failed++;
          continue;
        }

        if (isNaN(mrp) || mrp < 0) {
          const errorMsg = `Row ${rowNum}: Invalid MRP "${row.MRP}" (type: ${typeof row.MRP}) - must be a positive number`;
          console.warn(`⚠️ ${errorMsg}`);
          result.errors.push(errorMsg);
          result.failed++;
          continue;
        }

        console.log(`✅ Row ${rowNum}: Basic validation passed`);
        
        // Get or create location hierarchy
        const roomName = row.ROOM || (row as any)['Room'] || (row as any)['room'];
        const rackName = row.RACK || (row as any)['Rack'] || (row as any)['rack'];
        
        console.log(`🏢 Row ${rowNum}: Getting location hierarchy for ROOM: "${roomName}", RACK: "${rackName}"`);
        const { locationId, roomId, rackId } = await getOrCreateLocationHierarchy(
          'Main Office',
          roomName,
          rackName
        );
        console.log(`🏢 Row ${rowNum}: Location hierarchy created - Location: ${locationId}, Room: ${roomId}, Rack: ${rackId}`);

        // Find or create product
        console.log(`🔍 Row ${rowNum}: Looking for existing product with partNo: ${row['PART NO']}`);
        let product = await Product.findOne({ partNo: row['PART NO'] });

        if (!product) {
          console.log(`➕ Row ${rowNum}: Creating new product`);
          // Create new product
          product = await Product.create({
            name: description,
            partNo: partNo,
            category: getDepartmentCategory(dept),
            dept: dept,
            uom: uom,
            price: mrp,
            gndp: gndp,
            minStockLevel: 1,
            quantity: 0, // Will be set through stock
            hsnNumber: row['HSN CODE'] || '',
            gst: gst,
            cpcbNo: row['CPCB Norms'] || '',
            isActive: true,
            createdBy: req.user!.id
          });

          console.log(`✅ Row ${rowNum}: Product created with ID: ${product._id}`);
          result.createdProducts.push(product);
        } else {
          console.log(`📝 Row ${rowNum}: Found existing product with ID: ${product._id}`);
          // Update existing product with new information
          const updates: any = {};
          if (description && description !== product.name) {
            updates.name = description;
          }
          if (mrp && mrp !== product.price) {
            updates.price = mrp;
          }
          if (gndp && gndp !== (product as any).gndp) {
            updates.gndp = gndp;
          }
          if (row['HSN CODE'] && row['HSN CODE'] !== (product as any).hsnNumber) {
            updates.hsnNumber = row['HSN CODE'];
          }
          if (gst && gst !== product.gst) {
            updates.gst = gst;
          }

          if (Object.keys(updates).length > 0) {
            await Product.findByIdAndUpdate(product._id, updates);
            result.updatedProducts.push({ ...product.toObject(), ...updates });
          }
        }

        // Find or create stock entry
        let stock = await Stock.findOne({ 
          product: product._id, 
          location: locationId 
        });

        if (!stock) {
          // Create new stock entry
          stock = await Stock.create({
            product: product._id,
            location: locationId,
            room: roomId,
            rack: rackId,
            quantity: qty,
            availableQuantity: qty,
            reservedQuantity: 0,
            lastUpdated: new Date()
          });

          result.createdStocks.push(stock);
        } else {
          // Update existing stock
          const newQuantity = qty;
          const newAvailable = Math.max(0, newQuantity - stock.reservedQuantity);

          await Stock.findByIdAndUpdate(stock._id, {
            quantity: newQuantity,
            availableQuantity: newAvailable,
            room: roomId || stock.room,
            rack: rackId || stock.rack,
            lastUpdated: new Date()
          });

          result.updatedStocks.push({
            ...stock.toObject(),
            quantity: newQuantity,
            availableQuantity: newAvailable
          });
        }

        console.log(`✅ Row ${rowNum}: Successfully processed!`);
        result.successful++;
      } catch (error: any) {
        const errorMsg = `Row ${rowNum}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        console.error(`❌ Row ${rowNum}: Error stack:`, error.stack);
        console.error(`❌ Row ${rowNum}: Row data that caused error:`, {
          'PART NO': row['PART NO'],
          'DESCRIPTION': row['DESCRIPTION'], 
          'UOM': row['UOM'],
          'DEPT': row['DEPT'],
          'QTY': row['QTY'],
          'GNDP': row['GNDP'],
          'MRP': row['MRP'],
          'ROOM': row['ROOM'],
          'RACK': row['RACK']
        });
        result.errors.push(errorMsg);
        result.failed++;
      }
    }

    console.log('✅ Import processing completed');
    console.log('📊 Final results:', {
      successful: result.successful,
      failed: result.failed,
      errors: result.errors.length,
      createdProducts: result.createdProducts.length,
      createdStocks: result.createdStocks.length,
      updatedProducts: result.updatedProducts.length,
      updatedStocks: result.updatedStocks.length
    });

    // Log first 10 errors for debugging
    if (result.errors.length > 0) {
      console.log('❌ First 10 errors:');
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Import completed. ${result.successful} successful, ${result.failed} failed.`,
      data: result
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Import error:', error);
    next(error);
  }
};

// @desc    Download inventory import template
// @route   GET /api/v1/inventory/import-template
// @access  Private
export const downloadInventoryTemplate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  console.log('📥 Template download requested by user:', req.user?.email);
  try {
    // Create sample data for template
    const templateData = [
      {
        'SNO': 1,
        'PART NO': '00217R1204-OM',
        'DESCRIPTION': 'OIL FILTER 5KVA',
        'CPCB Norms': 'CPCB2',
        'UOM': 'pcs',
        'QTY': 15,
        'RACK': 'E2',
        'ROOM': 'ROOM 3',
        'DEPT': 'RETAIL',
        'GNDP': 230.73,
        'MRP': 345.00,
        'HSN CODE': '84212300',
        'GST': 18
      },
      {
        'SNO': 2,
        'PART NO': '00217R1604-OM',
        'DESCRIPTION': 'DONALDSON AIR FILTER 5KVA',
        'CPCB Norms': 'NA',
        'UOM': 'pcs',
        'QTY': 10,
        'RACK': 'E1',
        'ROOM': 'ROOM 3',
        'DEPT': 'RETAIL',
        'GNDP': 1783.37,
        'MRP': 2592.00,
        'HSN CODE': '84314930',
        'GST': 18
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-import-template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    res.send(buffer);
  } catch (error) {
    next(error);
  }
}; 