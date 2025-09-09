import { Response, NextFunction } from 'express';
import { OEMOrder } from '../models/OEMOrder';
import OEM from '../models/OEM';
import { DGPurchaseOrder } from '../models/DGPurchaseOrder';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';

// Generate next OEM Order number
const generateOEMOrderNumber = async () => {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'oemOrder' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `OEM-ORD-${String(counter.sequence).padStart(4, '0')}`;
};

// @desc    Create new OEM Order
// @route   POST /api/v1/oem-orders
// @access  Private
export const createOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { oemId, dgPurchaseOrderId, customerId, ...orderData } = req.body;

    // Validate OEM
    const oem = await OEM.findById(oemId);
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    // Validate DG Purchase Order
    const dgPurchaseOrder = await DGPurchaseOrder.findById(dgPurchaseOrderId);
    if (!dgPurchaseOrder) {
      return next(new AppError('DG Purchase Order not found', 404));
    }

    // Validate Customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Generate order number
    const orderNumber = await generateOEMOrderNumber();

    // Create OEM order
    const oemOrder = await OEMOrder.create({
      ...orderData,
      orderNumber,
      oem: oemId,
      dgPurchaseOrder: dgPurchaseOrderId,
      customer: customerId,
      // paymentTerms: oem.paymentTerms,
      // deliveryTerms: oem.deliveryTerms,
      // warrantyTerms: oem.warrantyTerms,
      createdBy: req.user?.id
    });

    await oemOrder.populate('oem dgPurchaseOrder customer createdBy');

    res.status(201).json({
      success: true,
      message: 'OEM Order created successfully',
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all OEM Orders
// @route   GET /api/v1/oem-orders
// @access  Private
export const getOEMOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status, deliveryStatus, paymentStatus, oemId } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'oem.companyName': { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (oemId) filter.oem = oemId;

    const total = await OEMOrder.countDocuments(filter);
    const oemOrders = await OEMOrder.find(filter)
      .populate('oem', 'companyName oemCode contactPerson phone email')
      .populate('dgPurchaseOrder', 'poNumber totalAmount')
      .populate('customer', 'name email phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: oemOrders,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single OEM Order
// @route   GET /api/v1/oem-orders/:id
// @access  Private
export const getOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oemOrder = await OEMOrder.findById(req.params.id)
      .populate('oem')
      .populate('dgPurchaseOrder')
      .populate('customer')
      .populate('createdBy', 'firstName lastName');

    if (!oemOrder) {
      return next(new AppError('OEM Order not found', 404));
    }

    res.json({
      success: true,
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM Order
// @route   PUT /api/v1/oem-orders/:id
// @access  Private
export const updateOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oemOrder = await OEMOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('oem dgPurchaseOrder customer createdBy');

    if (!oemOrder) {
      return next(new AppError('OEM Order not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM Order updated successfully',
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update OEM Order status
// @route   PATCH /api/v1/oem-orders/:id/status
// @access  Private
export const updateOEMOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, actualDeliveryDate } = req.body;
    
    const updateData: any = { status };
    if (status === 'delivered' && actualDeliveryDate) {
      updateData.actualDeliveryDate = actualDeliveryDate;
      updateData.deliveryStatus = 'completed';
    }

    const oemOrder = await OEMOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('oem customer');

    if (!oemOrder) {
      return next(new AppError('OEM Order not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM Order status updated successfully',
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery status
// @route   PATCH /api/v1/oem-orders/:id/delivery-status
// @access  Private
export const updateDeliveryStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deliveryStatus } = req.body;
    
    const oemOrder = await OEMOrder.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true, runValidators: true }
    ).populate('oem customer');

    if (!oemOrder) {
      return next(new AppError('OEM Order not found', 404));
    }

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create OEM Order from DG Purchase Order
// @route   POST /api/v1/oem-orders/from-po/:poId
// @access  Private
export const createOEMOrderFromPO = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { oemId, ...orderData } = req.body;

    const dgPurchaseOrder = await DGPurchaseOrder.findById(req.params.poId)
      .populate('customer');

    if (!dgPurchaseOrder) {
      return next(new AppError('DG Purchase Order not found', 404));
    }

    const oem = await OEM.findById(oemId);
    if (!oem) {
      return next(new AppError('OEM not found', 404));
    }

    const orderNumber = await generateOEMOrderNumber();

    // Convert PO items to OEM order items
    const items = dgPurchaseOrder.items.map(item => ({
      model: item.description,
      kva: '', // Not available in new model
      phase: '', // Not available in new model
      fuelType: 'diesel', // Default
      quantity: item.quantity,
      unitPrice: item.unitPrice * 0.8, // Assuming 20% margin
      totalPrice: item.totalPrice * 0.8,
      specifications: item.description, // Use description as specifications
      serialNumbers: []
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount;

    const oemOrder = await OEMOrder.create({
      orderNumber,
      oem: oemId,
      dgPurchaseOrder: dgPurchaseOrder._id,
      customer: dgPurchaseOrder.customer,
      orderDate: new Date(),
      expectedDeliveryDate: dgPurchaseOrder.expectedDeliveryDate,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      advanceAmount: 0,
      balanceAmount: totalAmount,
      deliveryAddress: {
        address: dgPurchaseOrder.customer.address || '',
        city: dgPurchaseOrder.customer.district || '',
        state: dgPurchaseOrder.customer.district || '',
        pincode: dgPurchaseOrder.customer.pinCode || '',
        contactPerson: dgPurchaseOrder.customer.name,
        phone: dgPurchaseOrder.customer.phone || ''
      },
      // paymentTerms: oem.paymentTerms,
      // deliveryTerms: oem.deliveryTerms,
      // warrantyTerms: oem.warrantyTerms,
      status: 'draft',
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      createdBy: req.user?.id,
      ...orderData
    });

    await oemOrder.populate('oem dgPurchaseOrder customer');

    res.status(201).json({
      success: true,
      message: 'OEM Order created from Purchase Order successfully',
      data: oemOrder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete OEM Order
// @route   DELETE /api/v1/oem-orders/:id
// @access  Private
export const deleteOEMOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oemOrder = await OEMOrder.findByIdAndDelete(req.params.id);

    if (!oemOrder) {
      return next(new AppError('OEM Order not found', 404));
    }

    res.json({
      success: true,
      message: 'OEM Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}; 