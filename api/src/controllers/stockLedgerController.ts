import { Response, NextFunction } from 'express';
import { StockLedger } from '../models/StockLedger';
import { Product } from '../models/Product';
import { StockLocation } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';

// @desc    Get stock ledger entries
// @route   GET /api/v1/stock/ledger
// @access  Private
export const getStockLedger = async (
  req: AuthenticatedRequest,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-transactionDate',
      search,
      stockId,
      type,
      locationId,
      fromDate,
      toDate,
      totalInward,
      totalOutward,
    } = req.query as QueryParams & {
      stockId?: string;
      type?: string;
      locationId?: string;
      fromDate?: string;
      toDate?: string;
      totalInward?: string;
      totalOutward?: string;
    };

    console.log('Stock Ledger Query Params:', { page, limit, sort, search, stockId, type, locationId, fromDate, toDate });

    const query: any = {};

    // Filter by product (stockId)
    if (stockId) {
      query.product = stockId;
    }

    // Filter by transaction type
    if (type) {
      query.transactionType = type;
    }

    // Filter by location
    if (locationId) {
      query.location = locationId;
    }

    // Filter by date range
    if (fromDate || toDate) {
      query.transactionDate = {};
      if (fromDate) {
        // Start of the day
        const startDate = new Date(fromDate);
        startDate.setHours(0, 0, 0, 0);
        query.transactionDate.$gte = startDate;
      }
      if (toDate) {
        // End of the day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        query.transactionDate.$lte = endDate;
      }
    }

    console.log('MongoDB Query Object:', JSON.stringify(query, null, 2));

    // Search functionality
    if (search) {
      const regex = new RegExp(search, 'i');

      const matchingProducts = await Product.find({
        $or: [
          { name: regex },
          { category: regex },
          { description: regex },
          { partNo: regex },
          { brand: regex }
        ]
      }).select('_id');

      const matchingLocations = await StockLocation.find({
        $or: [
          { name: regex },
          { contactPerson: regex },
          { address: regex }
        ]
      }).select('_id');

      query.$or = [
        { referenceId: regex },
        { reason: regex },
        { notes: regex },
        { product: { $in: matchingProducts.map(p => p._id) } },
        { location: { $in: matchingLocations.map(l => l._id) } }
      ];
    }

    const ledgerQuery = StockLedger.find(query)
      .populate('product', 'name category description brand partNo')
      .populate('location', 'name address contactPerson')
      .populate('performedBy', 'firstName lastName email')
      .sort(sort as string)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const [ledgers, total] = await Promise.all([
      ledgerQuery,
      StockLedger.countDocuments(query)
    ]);

    // Calculate summary statistics based on filtered results
    const summaryStats = await StockLedger.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: '$quantity' } }
        }
      }
    ]);

    // Calculate overall statistics (not filtered) for static display
    const overallStats = await StockLedger.aggregate([
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalQuantity: { $sum: { $abs: '$quantity' } }
        }
      }
    ]);

    const summary = {
      totalInward: summaryStats.find(stat => stat._id === 'inward')?.count || 0,
      totalOutward: summaryStats.find(stat => stat._id === 'outward')?.count || 0,
      totalAdjustment: summaryStats.find(stat => stat._id === 'adjustment')?.count || 0,
      totalTransfer: summaryStats.find(stat => stat._id === 'transfer')?.count || 0,
      totalReservation: summaryStats.find(stat => stat._id === 'reservation')?.count || 0,
      totalRelease: summaryStats.find(stat => stat._id === 'release')?.count || 0
    };

    const staticSummary = {
      totalInwardCount: overallStats.find(stat => stat._id === 'inward')?.count || 0,
      totalOutwardCount: overallStats.find(stat => stat._id === 'outward')?.count || 0,
      totalAdjustmentCount: overallStats.find(stat => stat._id === 'adjustment')?.count || 0,
      totalTransferCount: overallStats.find(stat => stat._id === 'transfer')?.count || 0,
      totalReservationCount: overallStats.find(stat => stat._id === 'reservation')?.count || 0,
      totalReleaseCount: overallStats.find(stat => stat._id === 'release')?.count || 0,
      totalInwardQuantity: overallStats.find(stat => stat._id === 'inward')?.totalQuantity || 0,
      totalOutwardQuantity: overallStats.find(stat => stat._id === 'outward')?.totalQuantity || 0
    };

    console.log(`Found ${total} total ledger entries, returning ${ledgers.length}`);
    console.log('Summary Stats:', summary);
    console.log('Static Summary:', staticSummary);

    res.status(200).json({
      success: true,
      message: 'Stock ledger retrieved successfully',
      data: { 
        ledgers,
        ...summary,
        staticSummary
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};
