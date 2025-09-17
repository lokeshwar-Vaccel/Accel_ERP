import { Response, NextFunction } from 'express';
import { OEMOrder } from '../models/OEMOrder';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import OEM from '../models/OEM';
import { Customer } from '../models/Customer';
import { DGProduct } from '../models/DGProduct';
import mongoose from 'mongoose';

// OEM Order Status enum
enum OEMOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  IN_PRODUCTION = 'in_production',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// @desc    Get all OEM orders
// @route   GET /api/v1/oem-orders
// @access  Private
export const getOEMOrders = async (
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
      oem,
      customer,
      dateFrom,
      dateTo
    } = req.query as QueryParams & {
      status?: OEMOrderStatus;
      oem?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (oem) {
      query.oem = oem;
    }

    if (customer) {
      query.customer = customer;
    }

    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) query.orderDate.$gte = new Date(dateFrom);
      if (dateTo) query.orderDate.$lte = new Date(dateTo);
    }

    // Execute query with pagination
    const orders = await OEMOrder.find(query)
      .populate('oem', 'companyName oemCode contactPersonName email mobileNo')
      .populate('customer', 'name email phone')
      .populate('items.product', 'description kva phase annexureRating dgModel numberOfCylinders subject')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await OEMOrder.countDocuments(query);

    const response: APIResponse = {
      success: true,
      data: {
        orders,
        pagination: {
          page: Number(page),
          pages: Math.ceil(total / limit),
          total,
          limit: Number(limit)
        }
      },
      message: 'OEM orders retrieved successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single OEM order
// @route   GET /api/v1/oem-orders/:id
// @access  Private
export const getOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await OEMOrder.findById(req.params.id)
      .populate('oem', 'companyName oemCode contactPersonName email mobileNo addresses')
      .populate('customer', 'name email phone addresses')
      .populate('items.product', 'description kva phase annexureRating dgModel numberOfCylinders subject')
      .populate('createdBy', 'firstName lastName email');

    if (!order) {
      return next(new AppError('OEM order not found', 404));
    }

    const response: APIResponse = {
      success: true,
      data: order,
      message: 'OEM order retrieved successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new OEM order
// @route   POST /api/v1/oem-orders
// @access  Private
export const createOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate OEM exists
    const oem = await OEM.findById(req.body.oem);
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    // Validate customer exists
    const customer = await Customer.findById(req.body.customer);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Validate DG products exist
    const productIds = req.body.items.map((item: any) => item.product);
    const products = await DGProduct.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      return next(new AppError('One or more DG products not found', 404));
    }

    // Calculate total amount from items
    let totalAmount = 0;
    if (req.body.items && req.body.items.length > 0) {
      req.body.items.forEach((item: any) => {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const discountRate = item.discountRate || 0;
        const taxRate = item.taxRate || 0;
        const subtotal = quantity * unitPrice;
        
        // GST inclusive price (base + GST)
        const gstInclusiveSubtotal = subtotal * (1 + taxRate / 100);
        
        // Calculate discount on GST-inclusive subtotal
        const discountAmount = Math.round((gstInclusiveSubtotal * discountRate) / 100);
        
        // Final total after discount
        const itemTotal = Math.round(gstInclusiveSubtotal - discountAmount);
        totalAmount += itemTotal;
      });
    }

    // Create OEM order
    const orderData = {
      ...req.body,
      totalAmount,
      createdBy: req.user?.id || 'system'
    };

    const order = new OEMOrder(orderData);
    await order.save();

    // Populate related data
    await order.populate([
      { path: 'oem', select: 'companyName oemCode contactPersonName email mobileNo' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'description kva phase annexureRating dgModel numberOfCylinders subject' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    const response: APIResponse = {
      success: true,
      data: order,
      message: 'OEM order created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM order
// @route   PUT /api/v1/oem-orders/:id
// @access  Private
export const updateOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await OEMOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('OEM order not found', 404));
    }

    // Validate OEM exists if provided
    if (req.body.oem) {
      const oem = await OEM.findById(req.body.oem);
      if (!oem) {
        return next(new AppError('OEM not found', 404));
      }
    }

    // Validate customer exists if provided
    if (req.body.customer) {
      const customer = await Customer.findById(req.body.customer);
      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }
    }

    // Validate DG products exist if provided
    if (req.body.items) {
      const productIds = req.body.items.map((item: any) => item.product);
      const products = await DGProduct.find({ _id: { $in: productIds } });
      if (products.length !== productIds.length) {
        return next(new AppError('One or more DG products not found', 404));
      }
    }

    // Update order
    const updatedOrder = await OEMOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'oem', select: 'companyName oemCode contactPersonName email mobileNo' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'description kva phase annexureRating dgModel numberOfCylinders subject' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    const response: APIResponse = {
      success: true,
      data: updatedOrder,
      message: 'OEM order updated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete OEM order
// @route   DELETE /api/v1/oem-orders/:id
// @access  Private
export const deleteOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await OEMOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('OEM order not found', 404));
    }

    // Check if order can be deleted (only draft orders can be deleted)
    if (order.status !== 'draft') {
      return next(new AppError('Only draft orders can be deleted', 400));
    }

    await OEMOrder.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'OEM order deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM order status
// @route   PUT /api/v1/oem-orders/:id/status
// @access  Private
export const updateOEMOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;

    const order = await OEMOrder.findById(req.params.id)
      .populate('oem', 'companyName oemCode contactPersonName email mobileNo')
      .populate('customer', 'name email phone')
      .populate('items.product', 'description kva phase annexureRating dgModel numberOfCylinders subject')
      .populate('createdBy', 'firstName lastName email');

    if (!order) {
      return next(new AppError('OEM order not found', 404));
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['confirmed', 'cancelled'],
      'confirmed': ['in_production', 'cancelled'],
      'in_production': ['ready_to_ship', 'cancelled'],
      'ready_to_ship': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'cancelled'],
      'delivered': [], // Cannot change from delivered
      'cancelled': [] // Cannot change from cancelled
    };

    // Check if current status exists in valid transitions
    if (!validTransitions[order.status]) {
      return next(new AppError(`Invalid current status: ${order.status}`, 400));
    }

    if (!validTransitions[order.status].includes(status)) {
      return next(new AppError(`Cannot change status from ${order.status} to ${status}`, 400));
    }

    order.status = status;
    await order.save();

    const response: APIResponse = {
      success: true,
      data: order,
      message: 'OEM order status updated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM order payment
// @route   PUT /api/v1/oem-orders/:id/payment
// @access  Private
export const updateOEMOrderPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paidAmount, paymentMethod, paymentMethodDetails, paymentDate } = req.body;

    const order = await OEMOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('OEM order not found', 404));
    }

    // Validate payment amount
    if (paidAmount < 0) {
      return next(new AppError('Payment amount cannot be negative', 400));
    }

    if (paidAmount > order.totalAmount) {
      return next(new AppError('Payment amount cannot exceed total amount', 400));
    }

    // Update payment information
    order.paidAmount = paidAmount;
    order.remainingAmount = Math.max(0, order.totalAmount - paidAmount);
    order.paymentMethod = paymentMethod;
    order.paymentMethodDetails = paymentMethodDetails;
    order.paymentDate = paymentDate ? new Date(paymentDate) : new Date();

    // Update payment status
    if (paidAmount === 0) {
      order.paymentStatus = 'pending';
    } else if (paidAmount < order.totalAmount) {
      order.paymentStatus = 'partial';
    } else {
      order.paymentStatus = 'paid';
    }

    await order.save();

    // Populate related data
    await order.populate([
      { path: 'oem', select: 'companyName oemCode contactPersonName email mobileNo' },
      { path: 'customer', select: 'name email phone' },
      { path: 'items.product', select: 'description kva phase annexureRating dgModel numberOfCylinders subject' },
      { path: 'createdBy', select: 'firstName lastName email' }
    ]);

    const response: APIResponse = {
      success: true,
      data: order,
      message: 'OEM order payment updated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get OEM order statistics
// @route   GET /api/v1/oem-orders/stats
// @access  Private
export const getOEMOrderStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await OEMOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalOrders = await OEMOrder.countDocuments();
    const totalAmount = await OEMOrder.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    const overdueOrders = await OEMOrder.find({
      expectedDeliveryDate: { $lt: new Date() },
      status: { $in: ['sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped'] }
    }).countDocuments();

    const response: APIResponse = {
      success: true,
      data: {
        stats,
        totalOrders,
        totalAmount: totalAmount[0]?.total || 0,
        overdueOrders
      },
      message: 'OEM order statistics retrieved successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate OEM order number
// @route   GET /api/v1/oem-orders/generate-number
// @access  Private
export const generateOEMOrderNumber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Find the last order number for this month
    const lastOrder = await OEMOrder.findOne({
      orderNumber: { $regex: `^OEM-${year}${month}` }
    }).sort({ orderNumber: -1 });

    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const orderNumberParts = lastOrder.orderNumber.split('-');
      if (orderNumberParts.length >= 3) {
        const lastSequence = parseInt(orderNumberParts[2]);
        if (!isNaN(lastSequence)) {
          sequence = lastSequence + 1;
        }
      }
    }

    const orderNumber = `OEM-${year}${month}-${String(sequence).padStart(4, '0')}`;

    const response: APIResponse = {
      success: true,
      data: { orderNumber },
      message: 'OEM order number generated successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};