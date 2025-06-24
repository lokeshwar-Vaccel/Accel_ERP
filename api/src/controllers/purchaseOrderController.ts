import { Response, NextFunction } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Stock } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// Purchase Order Status enum for internal use
enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  PARTIALLY_RECEIVED = 'partially_received',
  PENDING = 'pending',
  APPROVED = 'approved',
  COMPLETED = 'completed'
}

// @desc    Get all purchase orders
// @route   GET /api/v1/purchase-orders
// @access  Private
export const getPurchaseOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      search,
      status,
      supplier,
      dateFrom,
      dateTo
    } = req.query as QueryParams & {
      status?: PurchaseOrderStatus;
      supplier?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (supplier) {
      query.supplier = { $regex: supplier, $options: 'i' };
    }
    
    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
      if (dateTo) query.orderDate.$lte = new Date(dateTo);
    }

    // Execute query with pagination
    const orders = await PurchaseOrder.find(query)
      .populate('items.product', 'name category brand modelNumber price')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PurchaseOrder.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: { orders },
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

// @desc    Get single purchase order
// @route   GET /api/v1/purchase-orders/:id
// @access  Private
export const getPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('items.product', 'name category brand modelNumber specifications price')
      .populate('createdBy', 'firstName lastName email');

    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Purchase order retrieved successfully',
      data: { order }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new purchase order
// @route   POST /api/v1/purchase-orders
// @access  Private
export const createPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate order number
    const orderCount = await PurchaseOrder.countDocuments();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(orderCount + 1).padStart(4, '0')}`;

    // Calculate total amount
    let totalAmount = 0;
    for (const item of req.body.items) {
      totalAmount += item.quantity * item.unitPrice;
    }

    const orderData = {
      ...req.body,
      orderNumber,
      totalAmount,
      createdBy: req.user!.id
    };

    const order = await PurchaseOrder.create(orderData);

    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('items.product', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Purchase order created successfully',
      data: { order: populatedOrder }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update purchase order
// @route   PUT /api/v1/purchase-orders/:id
// @access  Private
export const updatePurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    // Recalculate total if items are updated
    if (req.body.items) {
      let totalAmount = 0;
      for (const item of req.body.items) {
        totalAmount += item.quantity * item.unitPrice;
      }
      req.body.totalAmount = totalAmount;
    }

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('items.product', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Purchase order updated successfully',
      data: { order: updatedOrder }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Send purchase order to supplier
// @route   PUT /api/v1/purchase-orders/:id/send
// @access  Private
export const sendPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (order.status !== 'draft') {
      return next(new AppError('Only draft purchase orders can be sent', 400));
    }

    order.status = 'sent';
    await order.save();

    const response: APIResponse = {
      success: true,
      message: 'Purchase order sent successfully',
      data: { order }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Receive purchase order items
// @route   POST /api/v1/purchase-orders/:id/receive
// @access  Private
export const receiveItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { receivedItems, location } = req.body;

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (order.status !== 'confirmed') {
      return next(new AppError('Purchase order must be confirmed before receiving items', 400));
    }

    // Update stock for received items
    for (const receivedItem of receivedItems) {
      const { productId, quantityReceived } = receivedItem;
      
      // Find or create stock record
      let stock = await Stock.findOne({ 
        product: productId, 
        location: location
      });

      if (stock) {
        stock.quantity += quantityReceived;
        stock.availableQuantity = stock.quantity - stock.reservedQuantity;
        stock.lastUpdated = new Date();
        await stock.save();
      } else {
        // Create new stock record if doesn't exist
        await Stock.create({
          product: productId,
          location: location,
          quantity: quantityReceived,
          availableQuantity: quantityReceived,
          reservedQuantity: 0,
          lastUpdated: new Date()
        });
      }
    }

    // Mark as received
    order.status = 'received';
    order.actualDeliveryDate = new Date();
    await order.save();

    const response: APIResponse = {
      success: true,
      message: 'Items received successfully',
      data: { 
        order,
        receivedItems
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel purchase order
// @route   PUT /api/v1/purchase-orders/:id/cancel
// @access  Private
export const cancelPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (order.status === 'received') {
      return next(new AppError('Cannot cancel received purchase order', 400));
    }

    order.status = 'cancelled';
    await order.save();

    const response: APIResponse = {
      success: true,
      message: 'Purchase order cancelled successfully',
      data: { order }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get purchase order statistics
// @route   GET /api/v1/purchase-orders/stats
// @access  Private
export const getPurchaseOrderStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalOrders = await PurchaseOrder.countDocuments();
    const draftOrders = await PurchaseOrder.countDocuments({ status: 'draft' });
    const sentOrders = await PurchaseOrder.countDocuments({ status: 'sent' });
    const confirmedOrders = await PurchaseOrder.countDocuments({ status: 'confirmed' });
    const receivedOrders = await PurchaseOrder.countDocuments({ status: 'received' });
    const cancelledOrders = await PurchaseOrder.countDocuments({ status: 'cancelled' });

    // Total purchase value
    const totalValueStats = await PurchaseOrder.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Orders by month
    const monthlyOrders = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      { $limit: 12 }
    ]);

    // Top suppliers by order count
    const topSuppliers = await PurchaseOrder.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$supplier',
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Purchase order statistics retrieved successfully',
      data: {
        totalOrders,
        draftOrders,
        sentOrders,
        confirmedOrders,
        receivedOrders,
        cancelledOrders,
        totalPurchaseValue: totalValueStats[0]?.totalValue || 0,
        avgOrderValue: totalValueStats[0]?.avgOrderValue || 0,
        monthlyOrders,
        topSuppliers
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 