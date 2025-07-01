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
      sort = '-lastUpdated', 
      search,
      location,
      lowStock,
      product
    } = req.query as QueryParams & {
      location?: string;
      lowStock?: string;
      product?: string;
    };

    // Build query
    const query: any = {};
    
    if (location) {
      query.location = location;
    }
    
    if (product) {
      query.product = product;
    }

    // Execute query with pagination
    let stockQuery = Stock.find(query)
      .populate('product', 'name partNo brand category hsnNumber dept productType1 productType2 productType3 make gst gndp price')
      .populate('location', 'name address type')
      .populate('room', 'name ')
      .populate('rack', 'name ')
      .sort(sort as string);

    // Filter by low stock if requested
    if (lowStock === 'true') {
      // We need to use aggregate pipeline for this complex query
      const lowStockItems = await Stock.aggregate([
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
          $addFields: {
            productInfo: { $arrayElemAt: ['$productInfo', 0] },
            locationInfo: { $arrayElemAt: ['$locationInfo', 0] }
          }
        },
        {
          $match: {
            $expr: {
              $lte: ['$quantity', '$productInfo.minStockLevel']
            }
          }
        },
        { $sort: { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } },
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) }
      ]);

      const total = await Stock.aggregate([
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
          $addFields: {
            productInfo: { $arrayElemAt: ['$productInfo', 0] }
          }
        },
        {
          $match: {
            $expr: {
              $lte: ['$quantity', '$productInfo.minStockLevel']
            }
          }
        },
        { $count: 'total' }
      ]);

      const response: APIResponse = {
        success: true,
        message: 'Low stock items retrieved successfully',
        data: { stockLevels: lowStockItems },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: total[0]?.total || 0,
          pages: Math.ceil((total[0]?.total || 0) / Number(limit))
        }
      };

      res.status(200).json(response);
      return;
    }

    // Handle search
    if (search) {
      // Get products matching search criteria
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { modelNumber: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      
      query.product = { $in: products.map(p => p._id) };
    }

    // Regular query
    const stockLevels = await stockQuery
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
    const { product, fromLocation, toLocation, quantity, notes  } = req.body;

    const sourceStock = await Stock.findOne({ product, location: fromLocation });
    if (!sourceStock || sourceStock.availableQuantity < quantity) {
      return next(new AppError('Insufficient stock at source location', 400));
    }

    sourceStock.quantity -= quantity;
    sourceStock.availableQuantity = sourceStock.quantity - sourceStock.reservedQuantity;
    sourceStock.lastUpdated = new Date();
    await sourceStock.save();

    let destStock = await Stock.findOne({ product, location: toLocation });
    if (!destStock) {
      destStock = new Stock({
        product,
        location: toLocation,
        quantity,
        reservedQuantity: 0
      });
    } else {
      destStock.quantity += quantity;
    }
    
    destStock.availableQuantity = destStock.quantity - destStock.reservedQuantity;
    destStock.lastUpdated = new Date();
    await destStock.save();

    const referenceId = await generateReferenceId('transfer');
    await StockLedger.create([
      {
        product,
        location: fromLocation,
        transactionType: 'outward',
        quantity: -quantity,
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
        transactionType: 'inward',
        quantity,
        notes,
        performedBy: req.user!.id,
        transactionDate: new Date(),
        resultingQuantity: destStock.quantity,
        referenceId,
        referenceType: 'transfer',
      }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Stock transferred successfully',
      data: {
        transfer: {
          product,
          fromLocation,
          toLocation,
          quantity,
          notes,
          transferredBy: req.user!.id,
          transferredAt: new Date(),
          referenceId,
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};