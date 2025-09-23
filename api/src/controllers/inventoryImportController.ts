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
    return ProductCategory.SPARE_PART;
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
    // Always treat roomName and rackName as strings
    const roomNameStr = roomName !== undefined && roomName !== null ? String(roomName).trim() : '';
    const rackNameStr = rackName !== undefined && rackName !== null ? String(rackName).trim() : '';
    // console.log(`🏢 Creating location hierarchy: Location="${locationName}", Room="${roomNameStr}", Rack="${rackNameStr}"`);
    
    // Find or create location
    let location = await StockLocation.findOne({ name: locationName });
    if (!location) {
      // console.log(`📍 Creating new location: ${locationName}`);
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
    if (roomNameStr) {
      let room = await Room.findOne({ 
        name: roomNameStr, 
        location: location._id 
      });
      
      if (!room) {
        // console.log(`🏠 Creating new room: ${roomNameStr} in ${locationName}`);
        room = await Room.create({
          name: roomNameStr,
          location: location._id,
          description: `Room in ${locationName}`,
          isActive: true
        });
      }
      roomId = room._id;

      // Create or find rack if specified and room exists
      if (rackNameStr) {
        let rack = await Rack.findOne({ 
          name: rackNameStr, 
          location: location._id,
          room: roomId
        });
        
        if (!rack) {
          console.log(`📦 Creating new rack: ${rackNameStr} in room ${roomNameStr}`);
          rack = await Rack.create({
            name: rackNameStr,
            location: location._id,
            room: roomId,
            description: `Rack in ${roomNameStr}, ${locationName}`,
            isActive: true
          });
        }
        rackId = rack._id;
      }
    }

    // console.log(`✅ Location hierarchy ready: Location=${location._id}, Room=${roomId}, Rack=${rackId}`);
    
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

    // --- Duplicate detection logic ---
    const rowKeyMap: Record<string, number[]> = {}; // key -> array of row indices
    rawData.forEach((row, idx) => {
      const partNo = (row as any)['PART NO'] || (row as any)['Part No'] || (row as any)['PartNo'] || (row as any)['partNo'];
      // Only use partNo for duplicate detection
      const key = `${partNo}`;
      if (!rowKeyMap[key]) rowKeyMap[key] = [];
      rowKeyMap[key].push(idx);
    });
    const duplicateRows: { key: string, indices: number[] }[] = [];
    Object.entries(rowKeyMap).forEach(([key, indices]) => {
      if (indices.length > 1) {
        duplicateRows.push({ key, indices });
      }
    });
    // Flat array of all duplicate row objects
    const duplicateRowObjects = duplicateRows.flatMap(group => group.indices.map(idx => rawData[idx]));
    // Grouped duplicates: array of { key, rows: [...] }
    const duplicateGroupsArray = duplicateRows.map(group => ({
      key: group.key,
      rows: group.indices.map(idx => rawData[idx])
    }));
    // Store duplicate row data in memory for download
    (req as any).duplicateRowData = duplicateRowObjects;
    // --- End duplicate detection ---

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
    const newProductPartNos = new Set<string>();
    let newProductsCount = 0;
    let stockUpdatesCount = 0;

    // --- Track unstored rows ---
    const unstoredRows: { row: any, reason: string }[] = [];
    // --- End track unstored rows ---

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
          }
        }
        
        // Only require the core essential fields now
        if (!partNo || !description || !uom) {
          preview.errors.push(`Row ${rowNum}: Missing essential fields (PART NO, DESCRIPTION, UOM) - Available columns: ${Object.keys(row).join(', ')}`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Missing essential fields (PART NO, DESCRIPTION, UOM)' });
          continue;
        }

        // Convert and validate numeric fields
        const qty = typeof row.QTY === 'number' ? row.QTY : parseFloat(String(row.QTY || 0));
        const gndp = typeof row.GNDP === 'number' ? row.GNDP : parseFloat(String(row.GNDP || 0));
        const mrp = typeof row.MRP === 'number' ? row.MRP : parseFloat(String(row.MRP || 0));

        if (isNaN(qty) || qty < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid quantity "${row.QTY}" - must be a positive number`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Invalid quantity' });
          continue;
        }

        if (isNaN(gndp) || gndp < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid GNDP price "${row.GNDP}" - must be a positive number`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Invalid GNDP price' });
          continue;
        }

        if (isNaN(mrp) || mrp < 0) {
          preview.errors.push(`Row ${rowNum}: Invalid MRP "${row.MRP}" - must be a positive number`);
          preview.invalidRows++;
          unstoredRows.push({ row, reason: 'Invalid MRP' });
          continue;
        }

        // Check for duplicate (by key)
        let roomName = row.ROOM || (row as any)['Room'] || (row as any)['room'];
        let rackName = row.RACK || (row as any)['Rack'] || (row as any)['rack'];
        const key = `${partNo}|Main Office|${roomName || ''}|${rackName || ''}`;
        if (rowKeyMap[key] && rowKeyMap[key].length > 1) {
          unstoredRows.push({ row, reason: 'Duplicate row (same PART NO, ROOM, RACK)' });
          // Note: Duplicates are still processed, but you may want to skip or flag them here.
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
          // Only count unique new PART NOs
          if (!newProductPartNos.has(partNo)) {
            newProductPartNos.add(partNo);
            newProductsCount++;
          }
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
        // reuse roomName and rackName here
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
        unstoredRows.push({ row, reason: error.message });
      }
    }

    // Calculate unique (non-duplicate) PART NOs for stockUpdates count
    const uniquePartNos = Object.keys(rowKeyMap);
    const duplicateCount = Object.values(rowKeyMap).reduce((acc, arr) => acc + (arr.length > 1 ? arr.length : 0), 0);
    const uniqueStockCount = uniquePartNos.length;
    const productsCount = uniquePartNos.length;

    const response: APIResponse = {
      success: true,
      message: 'Import preview generated successfully',
      data: {
        summary: {
          totalRows: preview.totalRows,
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          newProducts: newProductsCount,
          stockUpdates: uniqueStockCount, // Only unique PART NOs
          duplicateCount: duplicateCount,
          productsCount: productsCount,
          existingProducts: preview.existingProducts.length
        },
        errors: preview.errors,
        sample: sampleData,
        productsToCreate: preview.productsToCreate,
        stocksToCreate: preview.stocksToCreate,
        existingProducts: preview.existingProducts,
        duplicateGroups: duplicateGroupsArray,
        duplicateRows: duplicateRowObjects
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

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return next(new AppError('No file uploaded', 400));
    }

    // Parse Excel/CSV file
    const workbook = XLSX.read(req.file.buffer);
    console.log('📋 Sheet names:', workbook.SheetNames);
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Find the header row by looking for 'PART NO' column
    let headerRow = 0;
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100');
    
    for (let row = range.s.r; row <= Math.min(range.e.r, 10); row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 }); // Column B (where PART NO should be)
      const cell = worksheet[cellAddress];
      if (cell && cell.v && String(cell.v).includes('PART NO')) {
        headerRow = row;
        // console.log(`✅ Found header row at row ${row + 1} (Excel row ${row + 2})`);
        break;
      }
    }
    
    if (headerRow === 0) {
      headerRow = 4; // Row 5 in Excel (0-indexed)
    }
    
    // Parse data starting from the header row
    const rawData: InventoryImportInput[] = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRow // Start parsing from the header row
    });

    // if (rawData.length > 0) {
    //   Object.keys(rawData[0]).forEach(key => {
    //     console.log(`  - "${key}" (length: ${key.length}, type: ${typeof key})`);
    //   });
      
    //   // Check specifically for the required fields
    //   console.log('📝 Required field checks:');
    //   console.log(`  - 'PART NO' exists: ${!!rawData[0]['PART NO']}, value: "${rawData[0]['PART NO']}"`);
    //   console.log(`  - 'DESCRIPTION' exists: ${!!rawData[0]['DESCRIPTION']}, value: "${rawData[0]['DESCRIPTION']}"`);
    //   console.log(`  - 'UOM' exists: ${!!rawData[0]['UOM']}, value: "${rawData[0]['UOM']}"`);
    //   console.log(`  - 'DEPT' exists: ${!!rawData[0]['DEPT']}, value: "${rawData[0]['DEPT']}"`);
    // }

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

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // Excel row number


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

        
        // Get or create location hierarchy
        const roomName = row.ROOM || (row as any)['Room'] || (row as any)['room'];
        const rackName = row.RACK || (row as any)['Rack'] || (row as any)['rack'];
        
        const { locationId, roomId, rackId } = await getOrCreateLocationHierarchy(
          'Main Office',
          roomName,
          rackName
        );

        // Find or create product
        let product = await Product.findOne({ partNo: row['PART NO'] });

        if (!product) {
          // console.log(`➕ Row ${rowNum}: Creating new product`);
          // Create new product
          product = await Product.create({
            name: description,
            partNo: partNo,
            category: getDepartmentCategory(dept),
            dept: dept,
            uom: uom,
            price: mrp,
            gndp: gndp,
            minStockLevel: 0,
            maxStockLevel: 0,
            quantity: 0, // Will be set through stock
            hsnNumber: row['HSN CODE'] || '',
            gst: gst,
            cpcbNo: row['CPCB Norms'] || '',
            isActive: true,
            createdBy: req.user!.id
          });

          // console.log(`✅ Row ${rowNum}: Product created with ID: ${product._id}`);
          result.createdProducts.push(product);
        } else {
          // console.log(`📝 Row ${rowNum}: Found existing product with ID: ${product._id}`);
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

          // 🔔 AUTOMATIC NOTIFICATION TRIGGER
          // Check if stock change requires notification and send real-time alert
          try {
            const { Product } = await import('../models/Product');
            const { notificationService } = await import('../services/notificationService');
            
            const product = await Product.findById(stock.product);
            if (product) {
              const currentStock = newAvailable;
              const minStockLevel = product.minStockLevel || 0;
              const maxStockLevel = product.maxStockLevel || 0;

              // Determine notification type based on new stock level
              let notificationType: 'low_stock' | 'out_of_stock' | 'over_stock' | null = null;
              let threshold = 0;

              if (currentStock === 0 && minStockLevel > 0) {
                notificationType = 'out_of_stock';
                threshold = minStockLevel;
              } else if (currentStock > 0 && currentStock <= minStockLevel && minStockLevel > 0) {
                notificationType = 'low_stock';
                threshold = minStockLevel;
              } else if (maxStockLevel > 0 && currentStock > maxStockLevel) {
                notificationType = 'over_stock';
                threshold = maxStockLevel;
              }

              // If notification is needed, send it via WebSocket
              if (notificationType) {
                console.log(`🔔 Inventory import triggered ${notificationType} notification for product: ${product.name}`);
                
                // Get location details
                const { StockLocation } = await import('../models/Stock');
                const { Room } = await import('../models/Stock');
                const { Rack } = await import('../models/Stock');
                
                const location = await StockLocation.findById(stock.location);
                const room = roomId ? await Room.findById(roomId) : null;
                const rack = rackId ? await Rack.findById(rackId) : null;

                // Create real-time notification
                await notificationService.createInventoryNotification(
                  notificationType,
                  stock.product.toString(),
                  product.name,
                  product.partNo || 'N/A',
                  currentStock,
                  threshold,
                  location?.name || 'Unknown',
                  room?.name,
                  rack?.name
                );

                console.log(`✅ Real-time ${notificationType} notification sent for ${product.name}`);
              }
            }
          } catch (error) {
            // Don't let notification errors break the import operation
            console.error('❌ Error in automatic import stock notification:', error);
          }

          result.updatedStocks.push({
            ...stock.toObject(),
            quantity: newQuantity,
            availableQuantity: newAvailable
          });
        }

        // console.log(`✅ Row ${rowNum}: Successfully processed!`);
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

    // console.log('✅ Import processing completed');
    // console.log('📊 Final results:', {
    //   successful: result.successful,
    //   failed: result.failed,
    //   errors: result.errors.length,
    //   createdProducts: result.createdProducts.length,
    //   createdStocks: result.createdStocks.length,
    //   updatedProducts: result.updatedProducts.length,
    //   updatedStocks: result.updatedStocks.length
    // });

    // Log first 10 errors for debugging
    if (result.errors.length > 0) {
      // console.log('❌ First 10 errors:');
      result.errors.slice(0, 10).forEach((error, index) => {
        // console.log(`  ${index + 1}. ${error}`);
      });
      // if (result.errors.length > 10) {
      //   console.log(`  ... and ${result.errors.length - 10} more errors`);
      // }
    }

    // Calculate unique (non-duplicate) PART NOs for stockUpdates count
    const rowKeyMap: Record<string, number[]> = {};
    rawData.forEach((row, idx) => {
      const partNo = (row as any)['PART NO'] || (row as any)['Part No'] || (row as any)['PartNo'] || (row as any)['partNo'];
      const key = `${partNo}`;
      if (!rowKeyMap[key]) rowKeyMap[key] = [];
      rowKeyMap[key].push(idx);
    });
    const uniquePartNos = Object.keys(rowKeyMap);
    const duplicateCount = Object.values(rowKeyMap).reduce((acc, arr) => acc + (arr.length > 1 ? arr.length : 0), 0);
    const uniqueStockCount = uniquePartNos.length;
    const productsCount = uniquePartNos.length;

    // Set result.successful to uniqueStockCount
    result.successful = uniqueStockCount;

    const response: APIResponse = {
      success: true,
      message: `Import completed. ${result.successful} successful, ${result.failed} failed.`,
      data: {
        ...result,
        summary: {
          totalRows: rawData.length,
          stockUpdates: uniqueStockCount,
          duplicateCount: duplicateCount,
          productsCount: uniquePartNos.length
        }
      }
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
        'UOM': 'nos',
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
        'UOM': 'nos',
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

// @desc    Export current inventory as Excel in import format
// @route   GET /api/v1/inventory/export-excel
// @access  Private
export const exportInventoryExcel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Accept filters similar to GET /stock endpoint
    const {
      sort = 'product.name',
      search,
      location,
      room,
      rack,
      category,
      dept,
      brand,
      lowStock,
      outOfStock,
      overStocked,
      inStock
    } = req.query as any;

    // Build Mongo match query for ids
    const mongoose = require('mongoose');
    const idQuery: any = {};
    if (location) idQuery.location = new mongoose.Types.ObjectId(String(location));
    if (room) idQuery.room = new mongoose.Types.ObjectId(String(room));
    if (rack) idQuery.rack = new mongoose.Types.ObjectId(String(rack));

    // Build aggregation pipeline to support product-based filtering and stock status
    const XLSX = require('xlsx');
    const pipeline: any[] = [
      { $match: idQuery },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $lookup: {
          from: 'stocklocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo'
        }
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'room',
          foreignField: '_id',
          as: 'roomInfo'
        }
      },
      {
        $lookup: {
          from: 'racks',
          localField: 'rack',
          foreignField: '_id',
          as: 'rackInfo'
        }
      },
      {
        $addFields: {
          product: { $arrayElemAt: ['$productInfo', 0] },
          location: { $arrayElemAt: ['$locationInfo', 0] },
          room: { $arrayElemAt: ['$roomInfo', 0] },
          rack: { $arrayElemAt: ['$rackInfo', 0] }
        }
      }
    ];

    // Product-level filters
    const productMatch: any = {};
    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      productMatch.$or = [
        { 'product.name': { $regex: escaped, $options: 'i' } },
        { 'product.brand': { $regex: escaped, $options: 'i' } },
        { 'product.modelNumber': { $regex: escaped, $options: 'i' } },
        { 'product.partNo': { $regex: escaped, $options: 'i' } }
      ];
    }
    if (category) productMatch['product.category'] = category;
    if (dept) productMatch['product.dept'] = dept;
    if (brand) productMatch['product.brand'] = { $regex: String(brand), $options: 'i' };
    if (Object.keys(productMatch).length > 0) {
      pipeline.push({ $match: productMatch });
    }

    // Stock status filters
    if (lowStock === 'true' || outOfStock === 'true' || overStocked === 'true' || inStock === 'true') {
      const statusConditions: any[] = [];
      if (outOfStock === 'true') {
        statusConditions.push({ $lte: ['$quantity', 0] });
      }
      if (lowStock === 'true') {
        statusConditions.push({
          $and: [
            { $gt: ['$product.minStockLevel', 0] },
            { $lt: ['$quantity', '$product.minStockLevel'] },
            { $gt: ['$quantity', 0] }
          ]
        });
      }
      if (overStocked === 'true') {
        statusConditions.push({
          $and: [
            { $gt: ['$product.maxStockLevel', 0] },
            { $gt: ['$quantity', '$product.maxStockLevel'] }
          ]
        });
      }
      if (inStock === 'true') {
        statusConditions.push({
          $and: [
            { $gt: ['$quantity', 0] },
            { $or: [
              { $eq: ['$product.minStockLevel', 0] },
              { $gte: ['$quantity', '$product.minStockLevel'] }
            ] },
            { $or: [
              { $eq: ['$product.maxStockLevel', 0] },
              { $lte: ['$quantity', '$product.maxStockLevel'] }
            ] }
          ]
        });
      }
      if (statusConditions.length > 0) {
        pipeline.push({ $match: { $expr: { $or: statusConditions } } });
      }
    }

    // Sorting
    if (sort) {
      const sortField = String(sort).replace('-', '');
      const sortOrder = String(sort).startsWith('-') ? -1 : 1;
      const stringSortFields = [
        'product.name', 'product.category', 'product.brand', 'location.name', 'room.name', 'rack.name',
        'product.partNo', 'product.hsnNumber', 'product.dept', 'product.productType1', 'product.productType2', 'product.productType3', 'product.make', 'location.type'
      ];
      if (stringSortFields.includes(sortField)) {
        pipeline.push({ $addFields: { sortFieldLower: { $toLower: `$${sortField}` } } });
        pipeline.push({ $sort: { sortFieldLower: sortOrder } });
      } else {
        const sortObj: any = {};
        sortObj[sortField] = sortOrder;
        pipeline.push({ $sort: sortObj });
      }
    }

    const stocks = await Stock.aggregate(pipeline);

    const rows = stocks.map((stock, idx) => {
      const product = stock.product as any;
      return {
        'SNO': `${idx + 1}`, // convert to string for left alignment
        'PART NO': product?.partNo || '',
        'DESCRIPTION': product?.name || '',
        'CPCB Norms': product?.cpcbNo || '',
        'UOM': product?.uom || '',
        'QTY': `${stock.quantity ?? ''}`,
        'RACK': stock.rack && (stock.rack as any).name ? (stock.rack as any).name : '',
        'ROOM': stock.room && (stock.room as any).name ? (stock.room as any).name : '',
        'DEPT': product?.dept || '',
        'GNDP': product?.gndp != null ? product.gndp.toFixed(2) : '',
        'MRP': product?.price != null ? product.price.toFixed(2) : '',
        'HSN CODE': product?.hsnNumber || '',
        'GST': product?.gst != null ? product.gst.toFixed(2) : ''
      };
    });

    const wb = XLSX.utils.book_new();
    const title = 'Inventory Export';

    const header = [
      'SNO', 'PART NO', 'DESCRIPTION', 'CPCB Norms', 'UOM',
      'QTY', 'RACK', 'ROOM', 'DEPT', 'GNDP', 'MRP', 'HSN CODE', 'GST'
    ];

    const data = [header, ...rows.map(row => header.map(h => (row as Record<string, any>)[h]))];
    data.unshift([title]);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Merge title row
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } }];

    // Title row style
    ws['A1'].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' }
    };

    // Header style
    for (let c = 0; c < header.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
      if (cell) {
        cell.s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'FFD700' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }

    // Data rows style: all left-aligned, no number formatting
    for (let r = 2; r < data.length; r++) {
      for (let c = 0; c < header.length; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell) {
          cell.s = {
            alignment: { horizontal: 'left', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'AAAAAA' } },
              bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
              left: { style: 'thin', color: { rgb: 'AAAAAA' } },
              right: { style: 'thin', color: { rgb: 'AAAAAA' } }
            }
          };
        }
      }
    }

    // Freeze header
    ws['!freeze'] = { xSplit: 0, ySplit: 2 };

    // Auto-size columns (DESCRIPTION column wider)
    ws['!cols'] = header.map((h, i) => {
      let maxLen = h.length;
      for (let r = 2; r < data.length; r++) {
        const val = data[r][i];
        if (val && String(val).length > maxLen) maxLen = String(val).length;
      }
      return {
        wch: i === 2 ? Math.max(maxLen + 10, 30) : Math.min(Math.max(maxLen + 2, 10), 30)
      };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Export');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true });

    res.setHeader('Content-Disposition', 'attachment; filename=inventory-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};



// --- Add endpoint to download duplicate rows as Excel file ---
// @desc    Download duplicate inventory rows from last preview
// @route   GET /api/v1/inventory/duplicates-file
// @access  Private
export const downloadDuplicateRows = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a real app, you would store duplicateRowData in a cache or DB per user/session.
    // For demo, just return an empty file if not found.
    const duplicateRowData = (req as any).duplicateRowData || [];
    if (!duplicateRowData.length) {
      res.status(404).json({ success: false, message: 'No duplicate data available. Please run preview first.' });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(duplicateRowData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Duplicates');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-duplicates.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}; 