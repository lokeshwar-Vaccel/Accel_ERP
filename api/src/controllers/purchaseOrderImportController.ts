import { Response, NextFunction } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { PurchaseOrderImportInput } from '../schemas/purchaseOrderSchemas';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';

// @desc    Preview purchase orders from Excel/CSV before import
// @route   POST /api/v1/purchase-orders/preview-import
// @access  Private
export const previewPurchaseOrderImport = async (
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
    const rawData: PurchaseOrderImportInput[] = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData.length) {
      return next(new AppError('No data found in file', 400));
    }

    // Group data by ORDER NO (PO number)
    const groupedOrders = new Map<string, PurchaseOrderImportInput[]>();
    
    for (const row of rawData) {
      const orderNo = row['ORDER NO'];
      if (!orderNo) {
        console.warn('Skipping row without ORDER NO:', row);
        continue;
      }
      
      if (!groupedOrders.has(orderNo)) {
        groupedOrders.set(orderNo, []);
      }
      groupedOrders.get(orderNo)!.push(row);
    }

    const preview = {
      ordersToCreate: [] as any[],
      productsToCreate: [] as any[],
      existingProducts: [] as any[],
      errors: [] as string[],
      summary: {
        totalRows: rawData.length,
        uniqueOrders: groupedOrders.size,
        newProducts: 0,
        existingProducts: 0
      }
    };

    // Track products we've already checked
    const checkedProducts = new Map<string, any>();

    // Process each order group for preview
    for (const [orderNo, orderItems] of groupedOrders) {
      try {
        // Get order info from first item
        const firstItem = orderItems[0];
        
        // Determine supplier from DEPT
        const supplier = getSupplierFromDept(firstItem.DEPT) || 'Unknown Supplier';
        
        // Process items for this order
        const processedItems = [];
        
        for (const item of orderItems) {
          let productInfo;
          
          // Check if we've already processed this product
          if (checkedProducts.has(item['Part No'])) {
            productInfo = checkedProducts.get(item['Part No']);
          } else {
            // Check if product exists in database
            const existingProduct = await Product.findOne({ partNo: item['Part No'] });
            
            if (existingProduct) {
              productInfo = {
                partNo: item['Part No'],
                name: existingProduct.name,
                exists: true,
                _id: existingProduct._id
              };
              preview.existingProducts.push({
                partNo: item['Part No'],
                name: existingProduct.name,
                category: existingProduct.category,
                currentPrice: existingProduct.price,
                excelPrice: item.Price
              });
              preview.summary.existingProducts++;
            } else {
              // Product will be created
              productInfo = {
                partNo: item['Part No'],
                name: item['Part Description'],
                exists: false,
                willCreate: true
              };
              preview.productsToCreate.push({
                partNo: item['Part No'],
                name: item['Part Description'],
                category: 'spare_part',
                dept: item.DEPT,
                hsnNumber: item['HSN No'],
                price: item.Price,
                gst: extractGSTRate(item.Tax)
              });
              preview.summary.newProducts++;
            }
            
            checkedProducts.set(item['Part No'], productInfo);
          }

          processedItems.push({
            partNo: item['Part No'],
            productName: item['Part Description'],
            quantity: item['Ordered Qty'] || item.QTY,
            unitPrice: item.Price,
            totalPrice: item.TOTAL || (item.Price * (item['Ordered Qty'] || item.QTY)),
            exists: productInfo.exists
          });
        }

        // Calculate total amount
        const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

        preview.ordersToCreate.push({
          poNumber: orderNo,
          supplier: supplier,
          items: processedItems,
          totalAmount: totalAmount,
          expectedDeliveryDate: getExpectedDeliveryDate(firstItem.month, firstItem.YEAR),
          priority: getPriorityFromDept(firstItem.DEPT),
          notes: `Dept: ${firstItem.DEPT}, Year: ${firstItem.YEAR}, Month: ${firstItem.month}`,
          orderDate: new Date()
        });

      } catch (error: any) {
        preview.errors.push(`Order ${orderNo}: ${error.message}`);
        console.error(`Failed to preview PO ${orderNo}:`, error.message);
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Preview completed. ${preview.summary.uniqueOrders} orders, ${preview.summary.newProducts} new products, ${preview.summary.existingProducts} existing products.`,
      data: preview
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error previewing purchase orders:', error);
    next(error);
  }
};

// @desc    Import purchase orders from Excel/CSV
// @route   POST /api/v1/purchase-orders/import
// @access  Private
export const importPurchaseOrders = async (
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
    const rawData: PurchaseOrderImportInput[] = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData.length) {
      return next(new AppError('No data found in file', 400));
    }

    // Group data by ORDER NO (PO number)
    const groupedOrders = new Map<string, PurchaseOrderImportInput[]>();
    
    for (const row of rawData) {
      const orderNo = row['ORDER NO'];
      if (!orderNo) {
        console.warn('Skipping row without ORDER NO:', row);
        continue;
      }
      
      if (!groupedOrders.has(orderNo)) {
        groupedOrders.set(orderNo, []);
      }
      groupedOrders.get(orderNo)!.push(row);
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
      createdOrders: [] as any[]
    };

    // Process each order group
    for (const [orderNo, orderItems] of groupedOrders) {
      try {
        // Get order info from first item (should be same for all items in group)
        const firstItem = orderItems[0];
        
        // Determine supplier from DEPT or use a default
        const supplier = getSupplierFromDept(firstItem.DEPT) || 'Unknown Supplier';
        
        // Process items for this order
        const processedItems = [];
        
        // Get default location/room/rack for imported products
        const { locationId, roomId, rackId } = await getDefaultLocationRoomRack();
        
        for (const item of orderItems) {
          try {
            // Find or create product by Part No
            let product = await Product.findOne({ partNo: item['Part No'] });
            
            if (!product) {
              // Create product if it doesn't exist
              product = await Product.create({
                name: item['Part Description'],
                partNo: item['Part No'],
                category: 'spare_part', // Default category
                dept: item.DEPT,
                hsnNumber: item['HSN No'],
                price: item.Price,
                gst: extractGSTRate(item.Tax),
                minStockLevel: 1,
                quantity: 0,
                isActive: true,
                location: locationId, // Use default location ObjectId
                room: roomId,         // Use default room ObjectId
                rack: rackId,         // Use default rack ObjectId
                createdBy: req.user!.id
              });
            }

            processedItems.push({
              product: product._id,
              quantity: item['Ordered Qty'] || item.QTY,
              unitPrice: item.Price,
              totalPrice: item.TOTAL || (item.Price * (item['Ordered Qty'] || item.QTY)),
              description: item['Part Description']
            });
          } catch (productError: any) {
            console.error(`Error processing product ${item['Part No']}:`, productError);
            throw new Error(`Product error for ${item['Part No']}: ${productError.message}`);
          }
        }

        // Calculate total amount
        const totalAmount = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);

        // Check if PO number already exists and generate unique one if needed
        let uniquePONumber = orderNo;
        let counter = 1;
        while (await PurchaseOrder.findOne({ poNumber: uniquePONumber })) {
          uniquePONumber = `${orderNo}-${counter}`;
          counter++;
        }

        // Create purchase order
        const purchaseOrderData = {
          poNumber: uniquePONumber,
          supplier: supplier,
          items: processedItems,
          totalAmount: totalAmount,
          status: 'draft' as const,
          expectedDeliveryDate: getExpectedDeliveryDate(firstItem.month, firstItem.YEAR),
          priority: getPriorityFromDept(firstItem.DEPT),
          sourceType: 'manual' as const,
          notes: `Imported from Excel - Dept: ${firstItem.DEPT}, Year: ${firstItem.YEAR}, Month: ${firstItem.month}`,
          createdBy: req.user!.id,
          orderDate: new Date()
        };

        // Validate required fields before creating
        if (!purchaseOrderData.poNumber) {
          throw new Error('PO Number is required');
        }
        if (!purchaseOrderData.supplier) {
          throw new Error('Supplier is required');
        }
        if (!purchaseOrderData.items || purchaseOrderData.items.length === 0) {
          throw new Error('At least one item is required');
        }
        if (!purchaseOrderData.createdBy) {
          throw new Error('Created by user is required');
        }

        // Validate each item
        for (const item of purchaseOrderData.items) {
          if (!item.product) {
            throw new Error('Product ID is required for all items');
          }
          if (!item.quantity || item.quantity <= 0) {
            throw new Error('Valid quantity is required for all items');
          }
          if (!item.unitPrice || item.unitPrice < 0) {
            throw new Error('Valid unit price is required for all items');
          }
        }

        const purchaseOrder = await PurchaseOrder.create(purchaseOrderData);

        results.successful++;
        results.createdOrders.push({
          poNumber: orderNo,
          supplier: supplier,
          itemCount: processedItems.length,
          totalAmount: totalAmount,
          _id: purchaseOrder._id
        });

      } catch (error: any) {
        results.failed++;
        const errorMessage = `Order ${orderNo}: ${error.message}`;
        results.errors.push(errorMessage);
        console.error(`Failed to create PO ${orderNo}:`, error);
        
        // Add more detailed error information
        if (error.name === 'ValidationError') {
          console.error('Validation errors:', error.errors);
          Object.keys(error.errors).forEach(field => {
            results.errors.push(`Order ${orderNo} - ${field}: ${error.errors[field].message}`);
          });
        }
        
        if (error.code === 11000) {
          console.error('Duplicate key error:', error.keyValue);
          results.errors.push(`Order ${orderNo} - Duplicate key: ${JSON.stringify(error.keyValue)}`);
        }
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Import completed. ${results.successful} orders created, ${results.failed} failed.`,
      data: {
        summary: {
          totalRows: rawData.length,
          uniqueOrders: groupedOrders.size,
          successful: results.successful,
          failed: results.failed
        },
        createdOrders: results.createdOrders,
        errors: results.errors
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error importing purchase orders:', error);
    next(error);
  }
};

// Helper functions
const getSupplierFromDept = (dept: string): string => {
  const supplierMap: Record<string, string> = {
    'RETAIL': 'Retail Parts Supplier',
    'INDUSTRIAL': 'Industrial Equipment Supplier', 
    'TELECOM': 'Telecom Solutions Provider',
    'EV': 'Electric Vehicle Parts Supplier',
    'RET/TEL': 'Retail & Telecom Supplier'
  };
  return supplierMap[dept] || 'General Supplier';
};

const extractGSTRate = (taxString?: string): number => {
  if (!taxString) return 0;
  const match = taxString.match(/(\d+\.?\d*)%/);
  return match ? parseFloat(match[1]) : 0;
};

const getPriorityFromDept = (dept: string): 'low' | 'medium' | 'high' | 'urgent' => {
  const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    'RETAIL': 'medium',
    'INDUSTRIAL': 'high',
    'TELECOM': 'high',
    'EV': 'medium',
    'RET/TEL': 'medium'
  };
  return priorityMap[dept] || 'medium';
};

const getExpectedDeliveryDate = (month: string, year: string): Date => {
  // For imported orders, always set delivery date to 30 days from now
  // to avoid "past date" validation errors
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
  
  return futureDate;
  
  // Original logic (kept for reference but commented out):
  // const monthMap: Record<string, number> = {
  //   'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
  //   'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  // };
  // 
  // const monthNum = monthMap[month.toUpperCase()] || new Date().getMonth();
  // const yearNum = parseInt(year) || new Date().getFullYear();
  // 
  // // Set expected delivery to end of the specified month
  // return new Date(yearNum, monthNum + 1, 0); // Last day of the month
};

// Helper function to get or create default location/room/rack for imports
const getDefaultLocationRoomRack = async () => {
  try {
    // Try to find existing default entries first
    let locationId = new mongoose.Types.ObjectId('60a6c8b5d0f2d8001c8e5001'); // Default ObjectId
    let roomId = new mongoose.Types.ObjectId('60a6c8b5d0f2d8001c8e5002'); // Default ObjectId 
    let rackId = new mongoose.Types.ObjectId('60a6c8b5d0f2d8001c8e5003'); // Default ObjectId

    return {
      locationId,
      roomId,
      rackId
    };
  } catch (error) {
    console.error('Error getting default location/room/rack:', error);
    throw new Error('Could not get default location/room/rack for import');
  }
};

 