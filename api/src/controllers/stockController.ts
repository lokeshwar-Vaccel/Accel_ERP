import { Response, NextFunction } from 'express';
import { Stock } from '../models/Stock';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { StockLedger } from '../models/StockLedger';
import mongoose from 'mongoose';

// Utility to escape regex special characters in user input
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// @desc    Get all stock levels
// @route   GET /api/v1/stock
// @access  Private
export const getStockLevels = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'product.name',
      search,
      location,
      room,
      rack,
      lowStock,
      product,
      category,
      dept,
      brand,
      outOfStock,
      overStocked,
      inStock,
      stockId
    } = req.query as QueryParams & {
      location?: string;
      room?: string;
      rack?: string;
      lowStock?: string;
      product?: string;
      category?: string;
      dept?: string;
      brand?: string;
      outOfStock?: string;
      overStocked?: string;
      inStock?: string;
      stockId?: string;
    };

    // console.log('Stock levels request query:', req.query);
    // console.log('Stock status filters - lowStock:', lowStock, 'inStock:', inStock, 'outOfStock:', outOfStock, 'overStocked:', overStocked);

    // Build query
    const query: any = {};

    // FIX 1: Convert string IDs to ObjectId for proper MongoDB querying
    if (location) {
      query.location = new mongoose.Types.ObjectId(location);
    }

    if (room) {
      query.room = new mongoose.Types.ObjectId(room);
    }

    if (rack) {
      query.rack = new mongoose.Types.ObjectId(rack);
    }

    if (product) {
      query.product = new mongoose.Types.ObjectId(product);
    }

    if (stockId) {
      query._id = new mongoose.Types.ObjectId(stockId);
    }

    // console.log('Built query:', query); // Debug log

    // Handle search and product-based filters
    let productFilters: any = {};

    if (search) {
      const escapedSearch = escapeRegex(search);
      productFilters.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { brand: { $regex: escapedSearch, $options: 'i' } },
        { modelNumber: { $regex: escapedSearch, $options: 'i' } },
        { partNo: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    

    if (category) {
      productFilters.category = category;
    }

    if (dept) {
      productFilters.dept = dept;
    }

    if (brand) {
      productFilters.brand = { $regex: brand, $options: 'i' };
    }

    // FIX 2: Only apply product filters if we don't already have a direct product ID
    if (Object.keys(productFilters).length > 0 && !product) {
      const products = await Product.find(productFilters).select('_id');
      if (products.length > 0) {
        query.product = { $in: products.map(p => p._id) };
      } else {
        // If no products match the search criteria, return empty result
        const response: APIResponse = {
          success: true,
          message: 'No stock found matching search criteria',
          data: { stockLevels: [] },
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            pages: 0
          }
        };
        res.status(200).json(response);
        return;
      }
    }

    // FIX 3: Debug - Check if stock exists with the query
    const stockExists = await Stock.findOne(query);
    // console.log('Stock exists check:', stockExists ? 'Found' : 'Not found');
    // console.log('Query used:', JSON.stringify(query));

    // Determine if we need to use aggregation (for nested sort fields or stock status filters)
    const useAggregation = sort.includes('.') || lowStock === 'true' || outOfStock === 'true' || overStocked === 'true' || inStock === 'true';

    if (useAggregation) {
      // Support nested sort fields like 'product.name'
      const sortField = sort.replace('-', '');
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      const sortObj: any = {};
      let pipeline: any[] = [
        { $match: query },
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

      // FIX 4: Improve stock status filtering logic
      if (lowStock === 'true' || outOfStock === 'true' || overStocked === 'true' || inStock === 'true') {
        const statusConditions = [];

        // Out of Stock: quantity <= 0
        if (outOfStock === 'true') {
          statusConditions.push({ $lte: ['$quantity', 0] });
        }

        // Low Stock: minStock > 0 && quantity < minStock && quantity > 0
        if (lowStock === 'true') {
          statusConditions.push({
            $and: [
              { $gt: ['$product.minStockLevel', 0] },
              { $lt: ['$quantity', '$product.minStockLevel'] },
              { $gt: ['$quantity', 0] }
            ]
          });
        }

        // Overstocked: maxStock > 0 && quantity > maxStock
        if (overStocked === 'true') {
          statusConditions.push({
            $and: [
              { $gt: ['$product.maxStockLevel', 0] },
              { $gt: ['$quantity', '$product.maxStockLevel'] }
            ]
          });
        }

        // In Stock: (minStock === 0 || quantity >= minStock) && (maxStock === 0 || quantity <= maxStock) && quantity > 0
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
          pipeline.push({
            $match: {
              $expr: {
                $or: statusConditions
              }
            }
          });
        }
      }

      // Case-insensitive sorting for string fields
      const stringSortFields = [
        'product.name', 'product.category', 'product.brand', 'location.name', 'room.name', 'rack.name',
        'product.partNo', 'product.hsnNumber', 'product.dept', 'product.productType1', 'product.productType2', 'product.productType3', 'product.make', 'location.type'
      ];
      if (stringSortFields.includes(sortField)) {
        pipeline.push({
          $addFields: {
            sortFieldLower: { $toLower: `$${sortField}` }
          }
        });
        pipeline.push({ $sort: { sortFieldLower: sortOrder } });
      } else {
        // For non-string fields, sort as usual
        sortObj[sortField] = sortOrder;
        pipeline.push({ $sort: sortObj });
      }

      // FIX 5: Add debug for aggregation pipeline
      // console.log('Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

      pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
      pipeline.push({ $limit: Number(limit) });

      const stockStatusItems = await Stock.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [...pipeline];
      // Remove $skip, $limit, $sort, and $addFields for sortFieldLower for count
      const countPipelineFiltered = countPipeline.filter(stage =>
        !('$skip' in stage) &&
        !('$limit' in stage) &&
        !('$sort' in stage) &&
        !(stage.$addFields && stage.$addFields.sortFieldLower)
      );
      countPipelineFiltered.push({ $count: 'total' });
      const totalResult = await Stock.aggregate(countPipelineFiltered);
      const total = totalResult[0]?.total || 0;
      const pages = Math.ceil(total / Number(limit));

      let message = 'Stock items retrieved successfully';
      if (outOfStock === 'true') {
        message = 'Out of stock items retrieved successfully';
      } else if (lowStock === 'true') {
        message = 'Low stock items retrieved successfully';
      } else if (overStocked === 'true') {
        message = 'Overstocked items retrieved successfully';
      } else if (inStock === 'true') {
        message = 'In stock items retrieved successfully';
      }

      // --- FIX: Use aggregation for stock status counts ---
      // Low Stock
      const totalLowStockAgg = await Stock.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ['$product.minStockLevel', 0] },
                { $lt: ['$quantity', '$product.minStockLevel'] },
                { $gt: ['$quantity', 0] }
              ]
            }
          }
        },
        { $count: 'total' }
      ]);
      const totalLowStock = totalLowStockAgg[0]?.total || 0;

      // Out of Stock
      const totalOutOfStockAgg = await Stock.aggregate([
        {
          $match: { quantity: { $lte: 0 } }
        },
        { $count: 'total' }
      ]);
      const totalOutOfStock = totalOutOfStockAgg[0]?.total || 0;

      // Over Stocked
      const totalOverStockedAgg = await Stock.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $match: {
            $expr: {
              $and: [
                { $gt: ['$product.maxStockLevel', 0] },
                { $gt: ['$quantity', '$product.maxStockLevel'] }
              ]
            }
          }
        },
        { $count: 'total' }
      ]);
      const totalOverStocked = totalOverStockedAgg[0]?.total || 0;

      // In Stock
      const totalInStockAgg = await Stock.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $match: {
            $expr: {
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
            }
          }
        },
        { $count: 'total' }
      ]);
      const totalInStock = totalInStockAgg[0]?.total || 0;
      // --- END FIX ---

      const totalStock = await Stock.countDocuments({});
      // console.log("totalStock:",totalStock);
      const response: APIResponse = {
        success: true,
        message,
        data: { stockLevels: stockStatusItems },
        totalStock: totalStock,
        totalLowStock: totalLowStock,
        totalOutOfStock: totalOutOfStock,
        totalOverStocked: totalOverStocked,
        totalInStock: totalInStock,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages
        }
      };

      res.status(200).json(response);
      return;
    }

    // Regular query with proper population
    const stockLevels = await Stock.find(query)
      .populate('product', 'name partNo brand category hsnNumber dept productType1 productType2 productType3 make gst gndp price stockUnit minStockLevel')
      .populate('location', 'name address type')
      .populate('room', 'name')
      .populate('rack', 'name')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Stock.countDocuments(query);
    // console.log("total:",total);
    
    const pages = Math.ceil(total / Number(limit));

    // console.log('Final stock levels found:', stockLevels.length); // Debug log

    // --- FIX: Use aggregation for stock status counts ---
    // Low Stock
    const totalLowStockAgg = await Stock.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$product.minStockLevel', 0] },
              { $lt: ['$quantity', '$product.minStockLevel'] }
            ]
          }
        }
      },
      { $count: 'total' }
    ]);
    const totalLowStock = totalLowStockAgg[0]?.total || 0;

    // Out of Stock
    const totalOutOfStockAgg = await Stock.aggregate([
      {
        $match: { quantity: 0 }
      },
      { $count: 'total' }
    ]);
    const totalOutOfStock = totalOutOfStockAgg[0]?.total || 0;

    // Over Stocked
    const totalOverStockedAgg = await Stock.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $match: {
          $expr: {
            $and: [
              { $gt: ['$product.maxStockLevel', 0] },
              { $gt: ['$quantity', '$product.maxStockLevel'] }
            ]
          }
        }
      },
      { $count: 'total' }
    ]);
    const totalOverStocked = totalOverStockedAgg[0]?.total || 0;

    // In Stock
    const totalInStockAgg = await Stock.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $match: {
          $expr: {
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
          }
        }
      },
      { $count: 'total' }
    ]);
    const totalInStock = totalInStockAgg[0]?.total || 0;
    // --- END FIX ---

    const totalStock = await Stock.countDocuments({});

    const response: APIResponse = {
      success: true,
      message: 'Stock levels retrieved successfully',
      data: { stockLevels },
      totalStock: totalStock,
      totalLowStock: totalLowStock,
      totalOutOfStock: totalOutOfStock,
      totalOverStocked: totalOverStocked,
      totalInStock: totalInStock,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getStockLevels:', error);
    next(error);
  }
};

// @desc    Adjust stock levels
// @route   POST /api/v1/stock/adjust
// @access  Private
// export const adjustStock = async (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { product, location, adjustmentType, quantity, reason, notes } = req.body;

//     // Find existing stock record
//     let stock = await Stock.findOne({ product, location });

//     if (!stock) {
//       // Create new stock record if it doesn't exist
//       stock = new Stock({
//         product,
//         location,
//         quantity: adjustmentType === 'add' ? quantity : 0,
//         reservedQuantity: 0
//       });
//     } else {
//       // Adjust existing stock
//       if (adjustmentType === 'add') {
//         stock.quantity += quantity;
//       } else if (adjustmentType === 'subtract') {
//         if (stock.quantity < quantity) {
//           return next(new AppError('Insufficient stock for adjustment', 400));
//         }
//         stock.quantity -= quantity;
//       } else if (adjustmentType === 'set') {
//         stock.quantity = quantity;
//       }
//     }

//     stock.availableQuantity = stock.quantity - stock.reservedQuantity;
//     stock.lastUpdated = new Date();

//     await stock.save();

//     // Populate the response
//     const populatedStock = await Stock.findById(stock._id)
//       .populate('product', 'name category brand')
//       .populate('location', 'name address');

//     const response: APIResponse = {
//       success: true,
//       message: 'Stock adjusted successfully',
//       data: { 
//         stock: populatedStock,
//         adjustment: {
//           type: adjustmentType,
//           quantity,
//           reason,
//           notes,
//           adjustedBy: req.user!.id,
//           adjustedAt: new Date()
//         }
//       }
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// };

// @desc    Adjust stock levels
// @route   POST /api/v1/stock/adjust
// @access  Private
export const adjustStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { stockId, product, location, adjustmentType, quantity, reason, notes, reservationType, referenceId: reservationReferenceId, reservedUntil } = req.body;

    // console.log("stock-1:", stockId);
    const stock = await Stock.findById(stockId);

    if (!stock) {
      return next(new AppError('Stock record not found', 404));
    }

    // Store the original quantity before adjustment
    const originalQuantity = stock.quantity;
    console.log("originalQuantity:", originalQuantity);
    console.log("quantity:", quantity);

    if (adjustmentType === 'add') {
      stock.quantity += quantity;
    } else if (adjustmentType === 'subtract') {
      if (stock.quantity < quantity) {
        return next(new AppError('Insufficient stock for adjustment', 400));
      }
      stock.quantity -= quantity;
    } else if (adjustmentType === 'set') {
      stock.quantity = quantity;
    } else if (adjustmentType === 'reserve') {
      const availableQuantity = stock.quantity - stock.reservedQuantity;
      if (availableQuantity < quantity) {
        return next(new AppError('Insufficient available stock for reservation', 400));
      }
      stock.reservedQuantity += quantity;
    } else if (adjustmentType === 'release') {
      if (stock.reservedQuantity < quantity) {
        return next(new AppError('Cannot release more than reserved quantity', 400));
      }
      stock.reservedQuantity -= quantity;
    }

    console.log("stock.quantity:", originalQuantity);


    stock.availableQuantity = stock.quantity - stock.reservedQuantity;
    stock.lastUpdated = new Date();
    await stock.save();

    // 🔔 AUTOMATIC NOTIFICATION TRIGGER
    // Check if stock change requires notification and send real-time alert
    try {
      const { Product } = await import('../models/Product');
      const { notificationService } = await import('../services/notificationService');
      
      const product = await Product.findById(stock.product);
      if (product) {
        const currentStock = stock.availableQuantity;
        const minStockLevel = product.minStockLevel || 0;
        const maxStockLevel = product.maxStockLevel || 0;

        // Determine notification type based on stock level
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
          console.log(`🔔 Auto-triggering ${notificationType} notification for product: ${product.name}`);
          
          // Get location details
          const { StockLocation } = await import('../models/Stock');
          const { Room } = await import('../models/Stock');
          const { Rack } = await import('../models/Stock');
          
          const location = await StockLocation.findById(stock.location);
          const room = stock.room ? await Room.findById(stock.room) : null;
          const rack = stock.rack ? await Rack.findById(stock.rack) : null;

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
      // Don't let notification errors break the stock operation
      console.error('❌ Error in automatic stock notification:', error);
    }

    const referenceId = await generateReferenceId(
      adjustmentType === 'reserve' || adjustmentType === 'release' ? 'reservation' : 'adjustment'
    );

    // Determine transaction type and quantity for ledger
    let transactionType: string;
    let ledgerQuantity: number;
    let ledgerReason = reason;

    if (adjustmentType === 'reserve') {
      transactionType = 'reservation';
      ledgerQuantity = quantity; // Positive for reservations
      ledgerReason = `Stock Reserved - ${reservationType ? `${reservationType} - ` : ''}${reason}`;
    } else if (adjustmentType === 'release') {
      transactionType = 'release';
      ledgerQuantity = -quantity; // Negative for releases (reducing reserved)
      ledgerReason = `Reserved Stock Released - ${reason}`;
    } else {
      transactionType = 'adjustment';
      ledgerQuantity = adjustmentType === 'subtract' ? -quantity : quantity;
    }

    console.log("ledgerQuantity:", originalQuantity);
    

    await StockLedger.create({
      product,
      location,
      transactionType,
      quantity: ledgerQuantity,
      reason: ledgerReason,
      notes: adjustmentType === 'reserve' && reservationReferenceId
        ? `${notes || ''} [Ref: ${reservationReferenceId}]${reservedUntil ? ` [Until: ${new Date(reservedUntil).toLocaleDateString()}]` : ''}`.trim()
        : notes,
      performedBy: req.user!.id,
      transactionDate: new Date(),
      resultingQuantity: stock.quantity,
      previousQuantity: originalQuantity,
      referenceId,
      referenceType: adjustmentType === 'reserve' || adjustmentType === 'release' ? 'reservation' : 'adjustment',
    });

    const populatedStock = await Stock.findById(stock._id)
      .populate('product', 'name category brand')
      .populate('location', 'name address');

    const response: APIResponse = {
      success: true,
      message: adjustmentType === 'reserve' ? 'Stock reserved successfully' :
        adjustmentType === 'release' ? 'Reserved stock released successfully' :
          'Stock adjusted successfully',
      data: {
        stock: populatedStock,
        adjustment: {
          type: adjustmentType,
          quantity,
          reason,
          notes,
          adjustedBy: req.user!.id,
          adjustedAt: new Date(),
          referenceId,
          ...(adjustmentType === 'reserve' && {
            reservationType,
            reservationReferenceId,
            reservedUntil
          })
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


// @desc    Transfer stock between locations
// @route   POST /api/v1/stock/transfer
// @access  Private
// export const transferStock = async (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ): Promise<void> => {
//   try {
//     const { product, fromLocation, toLocation, quantity, notes } = req.body;

//     // Check source stock
//     const sourceStock = await Stock.findOne({ product, location: fromLocation });
//     if (!sourceStock || sourceStock.availableQuantity < quantity) {
//       return next(new AppError('Insufficient stock at source location', 400));
//     }

//     // Update source stock
//     sourceStock.quantity -= quantity;
//     sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
//     sourceStock.lastUpdated = new Date();
//     await sourceStock.save();

//     // Update or create destination stock
//     let destStock = await Stock.findOne({ product, location: toLocation });
//     if (!destStock) {
//       destStock = new Stock({
//         product,
//         location: toLocation,
//         quantity,
//         reservedQuantity: 0
//       });
//     } else {
//       destStock.quantity += quantity;
//     }

//     destStock.availableQuantity = destStock.quantity - destStock.reservedQuantity;
//     destStock.lastUpdated = new Date();
//     await destStock.save();

//     const response: APIResponse = {
//       success: true,
//       message: 'Stock transferred successfully',
//       data: {
//         transfer: {
//           product,
//           fromLocation,
//           toLocation,
//           quantity,
//           notes,
//           transferredBy: req.user!.id,
//           transferredAt: new Date()
//         }
//       }
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     next(error);
//   }
// }; 

// @desc    Transfer stock between locations
// @route   POST /api/v1/stock/transfer
// @access  Private
export const transferStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      stockId,
      product,
      fromLocation,
      fromRoom,
      fromRack,
      toLocation,
      toRoom,
      toRack,
      quantity,
      notes
    } = req.body;

    // Validate quantity
    if (!quantity || quantity <= 0) {
      return next(new AppError('Quantity must be greater than 0', 400));
    }

    // Find source stock by ID first, then validate the details
    const sourceStock = await Stock.findById(stockId);

    if (!sourceStock) {
      return next(new AppError(`Source stock not found with ID: ${stockId}`, 404));
    }

    // Validate that the source stock matches the provided details
    if (sourceStock.product.toString() !== product) {
      return next(new AppError('Source stock product does not match the provided product', 400));
    }

    if (sourceStock.location.toString() !== fromLocation) {
      return next(new AppError('Source stock location does not match the provided from location', 400));
    }

    // Check room and rack match (handle null values properly)
    const sourceRoom = sourceStock.room ? sourceStock.room.toString() : null;
    const sourceRack = sourceStock.rack ? sourceStock.rack.toString() : null;
    
    // For room/rack assignments, we allow updating from any current state
    // Only validate if this is a location transfer (different locations)
    const isLocationTransfer = fromLocation !== toLocation;
    
    if (isLocationTransfer) {
      // For location transfers, validate that source room/rack matches
      if (sourceRoom !== (fromRoom || null)) {
        return next(new AppError('Source stock room does not match the provided from room', 400));
      }

      if (sourceRack !== (fromRack || null)) {
        return next(new AppError('Source stock rack does not match the provided from rack', 400));
      }
    }
    // For room/rack assignments (same location), we don't validate source room/rack
    // as we're allowing updates from any current state

    if (sourceStock.availableQuantity < quantity) {
      return next(new AppError(`Insufficient stock at source location. Available: ${sourceStock.availableQuantity}, Requested: ${quantity}`, 400));
    }

    // Check if this is a location change or just room/rack reorganization
    const isLocationChange = fromLocation !== toLocation;
    const isRoomChange = (fromRoom || null) !== (toRoom || null);
    const isRackChange = (fromRack || null) !== (toRack || null);


    // Check if source and destination are the same
    if (!isLocationChange && !isRoomChange && !isRackChange) {
      return next(new AppError('Source and destination are the same. No transfer needed.', 400));
    }

    // console.log("Transfer type:", {
    //   isLocationChange,
    //   isRoomChange,
    //   isRackChange,
    //   fromLocation,
    //   toLocation,
    //   fromRoom,
    //   toRoom,
    //   fromRack,
    //   toRack
    // });

    const referenceId = await generateReferenceId('transfer');

    // Get location, room, and rack names for descriptions
    const [sourceStockPopulated, locationDoc, fromRoomDoc, fromRackDoc, toRoomDoc, toRackDoc] = await Promise.all([
      Stock.populate(sourceStock, [
        { path: 'location', select: 'name' },
        { path: 'room', select: 'name' },
        { path: 'rack', select: 'name' }
      ]),
      isLocationChange ? require('../models/Stock').StockLocation.findById(toLocation).select('name') : null,
      fromRoom ? require('../models/Stock').Room.findById(fromRoom).select('name') : null,
      fromRack ? require('../models/Stock').Rack.findById(fromRack).select('name') : null,
      toRoom ? require('../models/Stock').Room.findById(toRoom).select('name') : null,
      toRack ? require('../models/Stock').Rack.findById(toRack).select('name') : null
    ]);

    const fromLocationName = (sourceStockPopulated.location as any)?.name || 'Unknown Location';
    const toLocationName = isLocationChange ?
      (locationDoc as any)?.name || 'Unknown Location' :
      fromLocationName;

    const fromRoomName = (fromRoomDoc as any)?.name || (fromRoom ? 'Unknown Room' : '');
    const fromRackName = (fromRackDoc as any)?.name || (fromRack ? 'Unknown Rack' : '');
    const toRoomName = (toRoomDoc as any)?.name || (toRoom ? 'Unknown Room' : '');
    const toRackName = (toRackDoc as any)?.name || (toRack ? 'Unknown Rack' : '');

    const fromDesc = `${fromLocationName}${fromRoomName ? ` → ${fromRoomName}` : ''}${fromRackName ? ` → ${fromRackName}` : ''}`;
    const toDesc = `${toLocationName}${toRoomName ? ` → ${toRoomName}` : ''}${toRackName ? ` → ${toRackName}` : ''}`;

    // Store original quantities for ledger entries
    const originalSourceQuantity = sourceStock.quantity;
    let originalDestQuantity = 0;
    let destStock = null;

    if (isLocationChange) {
      // LOCATION TRANSFER: Different locations

      // Check if destination stock already exists with proper null handling
      const destQuery: any = {
        product,
        location: toLocation,
        room: toRoom || null,
        rack: toRack || null
      };

      destStock = await Stock.findOne(destQuery);

      if (destStock) {
        originalDestQuantity = destStock.quantity;
        // Update existing destination stock
        destStock.quantity += quantity;
        destStock.availableQuantity = destStock.quantity - destStock.reservedQuantity;
        destStock.lastUpdated = new Date();
      } else {
        // Create new destination stock with proper null handling
        destStock = new Stock({
          product,
          location: toLocation,
          room: toRoom || null,
          rack: toRack || null,
          quantity,
          reservedQuantity: 0,
          availableQuantity: quantity,
          lastUpdated: new Date()
        });
      }

      // Update source stock (subtract quantity)
      sourceStock.quantity -= quantity;
      sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
      sourceStock.lastUpdated = new Date();

      // Save both stocks
      await Promise.all([sourceStock.save(), destStock.save()]);

      // Create separate ledger entries for location transfers
      await StockLedger.create([
        {
          product,
          location: fromLocation,
          room: fromRoom || null,
          rack: fromRack || null,
          transactionType: 'transfer',
          quantity: -quantity,
          reason: `Stock transferred from ${fromDesc} to ${toDesc}`,
          notes,
          performedBy: req.user!.id,
          transactionDate: new Date(),
          resultingQuantity: sourceStock.quantity,
          previousQuantity: originalSourceQuantity,
          referenceId,
          referenceType: 'transfer'
        },
        {
          product,
          location: toLocation,
          room: toRoom || null,
          rack: toRack || null,
          transactionType: 'transfer',
          quantity: quantity,
          reason: `Stock received from ${fromDesc} to ${toDesc}`,
          notes,
          performedBy: req.user!.id,
          transactionDate: new Date(),
          resultingQuantity: destStock.quantity,
          previousQuantity: originalDestQuantity,
          referenceId,
          referenceType: 'transfer'
        }
      ]);
    } else {
      // ROOM/RACK TRANSFER: Same location, different room or rack
      console.log('Performing room/rack transfer:', {
        product,
        fromLocation,
        fromRoom,
        fromRack,
        toRoom,
        toRack,
        quantity
      });
      
      // Check if destination stock already exists
      const destQuery: any = {
        product,
        location: fromLocation, // Same location for room/rack transfer
        room: toRoom || null,
        rack: toRack || null
      };

      console.log('Checking for existing destination stock with query:', destQuery);
      destStock = await Stock.findOne(destQuery);
      console.log('Destination stock found:', destStock ? 'Yes' : 'No');

      if (destStock) {
        // Destination stock exists - merge quantities
        originalDestQuantity = destStock.quantity;
        destStock.quantity += quantity;
        destStock.availableQuantity = destStock.quantity - destStock.reservedQuantity;
        destStock.lastUpdated = new Date();
        
        // Update source stock (subtract quantity)
        sourceStock.quantity -= quantity;
        sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
        sourceStock.lastUpdated = new Date();

        // Save both stocks
        await Promise.all([sourceStock.save(), destStock.save()]);

        // Create ledger entries for the transfer
        await StockLedger.create([
          {
            product,
            location: fromLocation,
            room: fromRoom || null,
            rack: fromRack || null,
            transactionType: 'transfer',
            quantity: -quantity,
            reason: `Stock transferred from ${fromDesc} to ${toDesc}`,
            notes,
            performedBy: req.user!.id,
            transactionDate: new Date(),
            resultingQuantity: sourceStock.quantity,
            previousQuantity: originalSourceQuantity,
            referenceId,
            referenceType: 'transfer'
          },
          {
            product,
            location: fromLocation,
            room: toRoom || null,
            rack: toRack || null,
            transactionType: 'transfer',
            quantity: quantity,
            reason: `Stock received from ${fromDesc} to ${toDesc}`,
            notes,
            performedBy: req.user!.id,
            transactionDate: new Date(),
            resultingQuantity: destStock.quantity,
            previousQuantity: originalDestQuantity,
            referenceId,
            referenceType: 'transfer'
          }
        ]);
      } else {
        // Destination stock doesn't exist - create new and update source
        destStock = new Stock({
          product,
          location: fromLocation,
          room: toRoom || null,
          rack: toRack || null,
          quantity,
          reservedQuantity: 0,
          availableQuantity: quantity,
          lastUpdated: new Date()
        });

        // Update source stock (subtract quantity)
        sourceStock.quantity -= quantity;
        sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
        sourceStock.lastUpdated = new Date();

        // Save both stocks
        await Promise.all([sourceStock.save(), destStock.save()]);

        // Create ledger entries for the transfer
        await StockLedger.create([
          {
            product,
            location: fromLocation,
            room: fromRoom || null,
            rack: fromRack || null,
            transactionType: 'transfer',
            quantity: -quantity,
            reason: `Stock transferred from ${fromDesc} to ${toDesc}`,
            notes,
            performedBy: req.user!.id,
            transactionDate: new Date(),
            resultingQuantity: sourceStock.quantity,
            previousQuantity: originalSourceQuantity,
            referenceId,
            referenceType: 'transfer'
          },
          {
            product,
            location: fromLocation,
            room: toRoom || null,
            rack: toRack || null,
            transactionType: 'transfer',
            quantity: quantity,
            reason: `Stock received from ${fromDesc} to ${toDesc}`,
            notes,
            performedBy: req.user!.id,
            transactionDate: new Date(),
            resultingQuantity: destStock.quantity,
            previousQuantity: 0,
            referenceId,
            referenceType: 'transfer'
          }
        ]);
      }
    }

    // Clean up empty stock records (optional)
    if (sourceStock.quantity === 0 && sourceStock.reservedQuantity === 0) {
      await Stock.findByIdAndDelete(sourceStock._id);
    }

    const response: APIResponse = {
      success: true,
      message: isLocationChange ? 'Stock transferred successfully' : 'Room/Rack assignment updated successfully',
      data: {
        transfer: {
          product,
          fromLocation,
          fromRoom,
          fromRack,
          toLocation,
          toRoom,
          toRack,
          quantity,
          notes,
          transferredBy: req.user!.id,
          transferredAt: new Date(),
          referenceId,
          isLocationChange,
          isRoomChange,
          isRackChange,
          fromDescription: fromDesc,
          toDescription: toDesc,
          sourceStock: {
            id: sourceStock._id,
            remainingQuantity: sourceStock.quantity,
            availableQuantity: sourceStock.availableQuantity,
            room: sourceStock.room,
            rack: sourceStock.rack
          },
          destStock: {
            id: destStock._id,
            newQuantity: destStock.quantity,
            availableQuantity: destStock.availableQuantity,
            room: destStock.room,
            rack: destStock.rack
          }
        }
      }
    };


    res.status(200).json(response);
  } catch (error) {
    console.error('Transfer stock error:', error);
    next(error);
  }
};
