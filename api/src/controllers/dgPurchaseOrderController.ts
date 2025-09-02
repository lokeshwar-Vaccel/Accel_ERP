import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../errors/AppError';
import { DGPurchaseOrder } from '../models/DGPurchaseOrder';
import { DGQuotation } from '../models/DGQuotation';
import { Product } from '../models/Product';
import { generateReferenceId } from '../utils/generateReferenceId';
import {
  createDGPurchaseOrderSchema,
  updateDGPurchaseOrderSchema,
  getDGPurchaseOrdersQuerySchema,
  receiveDGPOSchema,
  updateDGPurchaseOrderStatusSchema
} from '../schemas/dgPurchaseOrderSchemas';

const calculatePOTotals = (items: any[]) => {
  let totalAmount = 0;
  
  items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const taxAmount = (itemTotal * item.taxRate) / 100;
    const totalPrice = itemTotal + taxAmount;
    totalAmount += totalPrice;
  });
  
  return {
    totalAmount: Math.round(totalAmount * 100) / 100
  };
};

export const createDGPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = createDGPurchaseOrderSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const poData = value;

    // Check if PO number already exists
    const existingPO = await DGPurchaseOrder.findOne({ 
      poNumber: poData.poNumber 
    });
    if (existingPO) {
      throw new AppError('Purchase Order number already exists', 400);
    }

    // Verify DG Quotation exists if provided
    if (poData.dgQuotation) {
      const dgQuotation = await DGQuotation.findById(poData.dgQuotation);
      if (!dgQuotation) {
        throw new AppError('DG Quotation not found', 404);
      }
    }

    // Calculate totals
    const totals = calculatePOTotals(poData.items);

    // Create purchase order
    const purchaseOrder = new DGPurchaseOrder({
      ...poData,
      ...totals,
      createdBy: req.user?.id || 'system'
    });

    await purchaseOrder.save();

    // Populate related data
    await purchaseOrder.populate('dgQuotation');

    res.status(201).json({
      success: true,
      data: purchaseOrder,
      message: 'DG Purchase Order created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDGPurchaseOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const purchaseOrder = await DGPurchaseOrder.findById(id)
      .populate('dgQuotation')
      .populate('createdBy', 'firstName lastName email');

    if (!purchaseOrder) {
      throw new AppError('DG Purchase Order not found', 404);
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    next(error);
  }
};

export const getAllDGPurchaseOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getDGPurchaseOrdersQuerySchema.validate(req.query);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      supplier,
      customerId,
      dgQuotation,
      startDate,
      endDate,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = value;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (supplier) {
      query.supplier = { $regex: supplier, $options: 'i' };
    }

    if (customerId) {
      query['customer._id'] = customerId;
    }

    if (dgQuotation) {
      query.dgQuotation = dgQuotation;
    }

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [purchaseOrders, total] = await Promise.all([
      DGPurchaseOrder.find(query)
        .populate('dgQuotation', 'quotationNumber')
      .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      DGPurchaseOrder.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: purchaseOrders,
      pagination: {
        page,
        limit,
      total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateDGPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateDGPurchaseOrderSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const updateData = value;

    // Check if PO number already exists (excluding current PO)
    if (updateData.poNumber) {
      const existingPO = await DGPurchaseOrder.findOne({ 
        poNumber: updateData.poNumber,
        _id: { $ne: id }
      });
      if (existingPO) {
        throw new AppError('Purchase Order number already exists', 400);
      }
    }

    // Verify DG Quotation exists if provided
    if (updateData.dgQuotation) {
      const dgQuotation = await DGQuotation.findById(updateData.dgQuotation);
      if (!dgQuotation) {
        throw new AppError('DG Quotation not found', 404);
      }
    }

    // Calculate totals if items are updated
    if (updateData.items) {
      const totals = calculatePOTotals(updateData.items);
      updateData.totalAmount = totals.totalAmount;
    }

    const purchaseOrder = await DGPurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('dgQuotation');

    if (!purchaseOrder) {
      throw new AppError('DG Purchase Order not found', 404);
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
      message: 'DG Purchase Order updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDGPurchaseOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const purchaseOrder = await DGPurchaseOrder.findByIdAndDelete(id);

    if (!purchaseOrder) {
      throw new AppError('DG Purchase Order not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'DG Purchase Order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getDGPurchaseOrderStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await DGPurchaseOrder.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          draft: {
            $sum: {
              $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
            }
          },
          sent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'sent'] }, 1, 0]
            }
          },
          confirmed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0]
            }
          },
          received: {
            $sum: {
              $cond: [{ $eq: ['$status', 'received'] }, 1, 0]
            }
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0]
            }
          },
          partially_received: {
            $sum: {
              $cond: [{ $eq: ['$status', 'partially_received'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      totalAmount: 0,
      draft: 0,
      sent: 0,
      confirmed: 0,
      received: 0,
      cancelled: 0,
      partially_received: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const generatePONumber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const poNumber = await generateReferenceId('DGPO');
    res.status(200).json({ success: true, data: { poNumber } });
  } catch (error) {
    next(error);
  }
};

export const updateDGPurchaseOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateDGPurchaseOrderStatusSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { status, notes } = value;

    const purchaseOrder = await DGPurchaseOrder.findByIdAndUpdate(
      id,
      { 
        status,
        ...(notes && { notes: `${notes}\nStatus updated to ${status} on ${new Date().toISOString()}` })
      },
      { new: true, runValidators: true }
    ).populate('dgQuotation');

    if (!purchaseOrder) {
      throw new AppError('DG Purchase Order not found', 404);
    }

    res.status(200).json({
      success: true,
      data: purchaseOrder,
      message: `DG Purchase Order status updated to ${status}`
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrdersByQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quotationId } = req.params;

    const purchaseOrders = await DGPurchaseOrder.find({ dgQuotation: quotationId })
      .populate('dgQuotation', 'quotationNumber')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: purchaseOrders
    });
  } catch (error) {
    next(error);
  }
};

export const receiveItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const receiveData = req.body;

    // Validate request body
    const { error, value } = receiveDGPOSchema.validate(receiveData);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Find the purchase order
    const purchaseOrder = await DGPurchaseOrder.findById(id);
    if (!purchaseOrder) {
      throw new AppError('DG Purchase Order not found', 404);
    }

    // Check if PO is in a state that allows receiving items
    if (!['confirmed', 'partially_received'].includes(purchaseOrder.status)) {
      throw new AppError('Purchase order must be confirmed or partially received to receive items', 400);
    }

    // Update items with received quantities
    const updatedItems = purchaseOrder.items.map((item, index) => {
      const receivedItem = receiveData.receivedItems[index];
      if (receivedItem && receivedItem.quantityReceived > 0) {
        const currentReceived = item.receivedQuantity || 0;
        const newReceived = currentReceived + receivedItem.quantityReceived;
        
        return {
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          taxRate: item.taxRate,
          receivedQuantity: newReceived,
          notes: item.notes
        };
      }
      return item;
    });

    // Determine new status based on received quantities
    let newStatus = purchaseOrder.status;
    const allItemsReceived = updatedItems.every(item => 
      (item.receivedQuantity || 0) >= item.quantity
    );
    const someItemsReceived = updatedItems.some(item => 
      (item.receivedQuantity || 0) > 0
    );

    if (allItemsReceived) {
      newStatus = 'received';
    } else if (someItemsReceived) {
      newStatus = 'partially_received';
    }

    // Update the purchase order
    const updatedPO = await DGPurchaseOrder.findByIdAndUpdate(
      id,
      {
        items: updatedItems,
        status: newStatus,
        actualDeliveryDate: new Date(),
        notes: `${purchaseOrder.notes || ''}\nItems received on ${new Date().toISOString()}. ${receiveData.notes || ''}`
      },
      { new: true, runValidators: true }
    ).populate('dgQuotation');

    // TODO: Update inventory stock levels here
    // This would involve updating the stock quantities for received items

    res.status(200).json({
      success: true,
      data: updatedPO,
      message: 'Items received successfully'
    });
  } catch (error) {
    next(error);
  }
}; 