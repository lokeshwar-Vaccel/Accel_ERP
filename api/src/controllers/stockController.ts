import { Response, NextFunction } from 'express';
import { Stock } from '../models/Stock';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { StockLedger } from '../models/StockLedger';

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
      overStocked
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
    };

    console.log('Stock levels request query:', req.query);
    console.log('Stock status filters - lowStock:', lowStock, 'outOfStock:', outOfStock, 'overStocked:', overStocked);

    // Build query
    const query: any = {};
    
    if (location) {
      query.location = location;
    }
    
    if (room) {
      query.room = room;
    }
    
    if (rack) {
      query.rack = rack;
    }
    
    if (product) {
      query.product = product;
    }

    // Handle search and product-based filters
    let productFilters: any = {};
    
    if (search) {
      productFilters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { modelNumber: { $regex: search, $options: 'i' } },
        { partNo: { $regex: search, $options: 'i' } }
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
    
    // If we have product filters, get the product IDs first
    if (Object.keys(productFilters).length > 0) {
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

    // Determine if we need to use aggregation (for nested sort fields or stock status filters)
    const useAggregation = sort.includes('.') || lowStock === 'true' || outOfStock === 'true' || overStocked === 'true';

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

      // If filtering by stock status, add $match for status
      if (lowStock === 'true' || outOfStock === 'true' || overStocked === 'true') {
        pipeline.push({
          $match: {
            $expr: {
              $or: [
                {
                  $and: [
                    { $eq: [outOfStock, 'true'] },
                    { $eq: ['$quantity', 0] }
                  ]
                },
                {
                  $and: [
                    { $eq: [lowStock, 'true'] },
                    { $ne: [outOfStock, 'true'] },
                    { $ne: [overStocked, 'true'] },
                    { $lte: ['$quantity', { $ifNull: ['$product.minStockLevel', 0] }] },
                    { $gt: ['$quantity', 0] }
                  ]
                },
                {
                  $and: [
                    { $eq: [overStocked, 'true'] },
                    { $ne: [outOfStock, 'true'] },
                    { $ne: [lowStock, 'true'] },
                    { $gt: ['$quantity', { $multiply: [{ $ifNull: ['$product.minStockLevel', 0] }, 3] }] }
                  ]
                }
              ]
            }
          }
        });
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
      pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
      pipeline.push({ $limit: Number(limit) });

      const stockStatusItems = await Stock.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [...pipeline];
      // Remove $skip, $limit, $sort, and $addFields for sortFieldLower for count
      const countPipelineFiltered = countPipeline.filter(stage => !('$skip' in stage) && !('$limit' in stage) && !('$sort' in stage) && !(stage.$addFields && stage.$addFields.sortFieldLower));
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
      }

      const response: APIResponse = {
        success: true,
        message,
        data: { stockLevels: stockStatusItems },
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
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Stock levels retrieved successfully',
      data: { stockLevels },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages
      }
    };

    res.status(200).json(response);
  } catch (error) {
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
    const { product, location, adjustmentType, quantity, reason, notes, reservationType, referenceId: reservationReferenceId, reservedUntil } = req.body;

    let stock = await Stock.findOne({ product, location });

    if (!stock) {
      stock = new Stock({
        product,
        location,
        quantity: adjustmentType === 'add' ? quantity : 0,
        reservedQuantity: 0
      });
    } else {
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
    }

    stock.availableQuantity = stock.quantity - stock.reservedQuantity;
    stock.lastUpdated = new Date();
    await stock.save();

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

    const sourceStock = await Stock.findOne({ product, location: fromLocation });
    if (!sourceStock || sourceStock.availableQuantity < quantity) {
      return next(new AppError('Insufficient stock at source location', 400));
    }

    // Check if this is a location change (not just room/rack reorganization)
    const isLocationChange = fromLocation !== toLocation;
    
    if (isLocationChange) {
      // Update source stock (subtract quantity)
      sourceStock.quantity -= quantity;
      sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
      sourceStock.lastUpdated = new Date();
      await sourceStock.save();

      // Update or create destination stock
      let destStock = await Stock.findOne({ product, location: toLocation });
      if (!destStock) {
        destStock = new Stock({
          product,
          location: toLocation,
          room: toRoom || undefined,
          rack: toRack || undefined,
          quantity,
          reservedQuantity: 0
        });
      } else {
        destStock.quantity += quantity;
        if (toRoom) destStock.room = toRoom;
        if (toRack) destStock.rack = toRack;
      }
      
      destStock.availableQuantity = destStock.quantity - destStock.reservedQuantity;
      destStock.lastUpdated = new Date();
      await destStock.save();
    } else {
      // Same location, just updating room/rack
      if (toRoom) sourceStock.room = toRoom;
      if (toRack) sourceStock.rack = toRack;
      sourceStock.lastUpdated = new Date();
      await sourceStock.save();
    }

    const referenceId = await generateReferenceId('transfer');
    
    // Create transfer ledger entries - get location names for descriptions
    const [fromLocationDoc, toLocationDoc] = await Promise.all([
      Stock.populate(sourceStock, { path: 'location', select: 'name' }),
      toLocation !== fromLocation ? 
        require('../models/Stock').StockLocation.findById(toLocation).select('name') : 
        Stock.populate(sourceStock, { path: 'location', select: 'name' })
    ]);
    
    const fromLocationName = (fromLocationDoc.location as any)?.name || 'Unknown Location';
    const toLocationName = isLocationChange ? 
      (toLocationDoc as any)?.name || 'Unknown Location' : 
      fromLocationName;
    
    const fromDesc = `${fromLocationName}${fromRoom ? ` → ${fromRoom}` : ''}${fromRack ? ` → ${fromRack}` : ''}`;
    const toDesc = `${toLocationName}${toRoom ? ` → ${toRoom}` : ''}${toRack ? ` → ${toRack}` : ''}`;

    if (isLocationChange) {
      // Create separate ledger entries for location transfers
      await StockLedger.create([
        {
          product,
          location: fromLocation,
          transactionType: 'transfer',
          quantity: -quantity,
          reason: `Stock transferred from ${fromDesc} to ${toDesc}`,
          notes,
          performedBy: req.user!.id,
          transactionDate: new Date(),
          resultingQuantity: sourceStock.quantity,
          referenceId,
          referenceType: 'transfer'
        },
        {
          product,
          location: toLocation,
          transactionType: 'transfer',
          quantity,
          reason: `Stock received from ${fromDesc} to ${toDesc}`,
          notes,
          performedBy: req.user!.id,
          transactionDate: new Date(),
          resultingQuantity: isLocationChange ? (await Stock.findOne({ product, location: toLocation }))?.quantity || quantity : sourceStock.quantity,
          referenceId,
          referenceType: 'transfer',
        }
      ]);
    } else {
      // Single ledger entry for room/rack reorganization
      await StockLedger.create({
        product,
        location: fromLocation,
        transactionType: 'transfer',
        quantity: 0, // No quantity change for reorganization
        reason: `Stock relocated from ${fromDesc} to ${toDesc}`,
        notes,
        performedBy: req.user!.id,
        transactionDate: new Date(),
        resultingQuantity: sourceStock.quantity,
        referenceId,
        referenceType: 'transfer'
      });
    }

    const response: APIResponse = {
      success: true,
      message: isLocationChange ? 'Stock transferred successfully' : 'Stock relocated successfully',
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
          fromDescription: fromDesc,
          toDescription: toDesc
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};
