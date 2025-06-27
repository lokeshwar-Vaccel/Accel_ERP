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
      stockId
    } = req.query as QueryParams & {
      stockId?: string;
    };

    const query: any = {};

    if (stockId) {
      query.product = stockId;
    }

    if (search) {
      const regex = new RegExp(search, 'i');

      const matchingProducts = await Product.find({
        $or: [
          { name: regex },
          { category: regex },
          { description: regex }
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
        { product: { $in: matchingProducts.map(p => p._id) } },
        { location: { $in: matchingLocations.map(l => l._id) } }
      ];
    }

    const ledgerQuery = StockLedger.find(query)
      .populate('product', 'name category description')
      .populate('location', 'name address contactPerson')
      .sort(sort as string)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const [ledgers, total] = await Promise.all([
      ledgerQuery,
      StockLedger.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      message: 'Stock ledger retrieved successfully',
      data: { ledgers },
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
