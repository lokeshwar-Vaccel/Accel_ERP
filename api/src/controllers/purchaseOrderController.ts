import { Response, NextFunction } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Stock } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Product } from '../models/Product';
import { Invoice } from '../models/Invoice';
import mongoose, { Types } from 'mongoose';

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

type InvoiceItemInput = {
  product: string;
  quantity: number;
  unitPrice: number;
  description?: string;
  taxRate?: number;
};

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
        { poNumber: { $regex: search, $options: 'i' } },
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
      .populate('items.product', 'name category brand modelNumber partNo price gst')
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
      .populate('items.product', 'name category brand modelNumber partNo specifications price gst')
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
    // Calculate total amount from items
    let totalAmount = 0;
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        totalAmount += (item.quantity || 0) * (item.unitPrice || 0);
      }
    }

    // Prepare order data - let the model handle poNumber generation via pre-save hook
    const orderData = {
      ...req.body,
      totalAmount,
      createdBy: req.user!.id,
      orderDate: new Date()
    };
    
    const order = await PurchaseOrder.create(orderData);
    
    const populatedOrder = await PurchaseOrder.findById(order._id)
    .populate('items.product', 'name category brand modelNumber partNo price gst')
    .populate('createdBy', 'firstName lastName email');
    
    const response: APIResponse = {
      success: true,
      message: 'Purchase order created successfully',
      data: populatedOrder
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating purchase order:', error);
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
      .populate('items.product', 'name category brand partNo')
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
    const { receivedItems, location, receiptDate, inspectedBy, notes, externalInvoiceNumber, externalInvoiceTotal, supplierName, supplierEmail, items } = req.body;

    console.log("items:",items);
    
    const order = await PurchaseOrder.findById(req.params.id)
    .populate('items.product', 'name category brand partNo');
    console.log("order------------:",order);

    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (!['confirmed', 'partially_received'].includes(order.status)) {
      return next(new AppError('Purchase order must be confirmed before receiving items', 400));
    }

    let totalOrderedQuantity = 0;
    let totalReceivedQuantity = 0;
    const results: { errors: string[] } = { errors: [] };

    console.log("receivedItems:",receivedItems);
    
    // Process each received item
    for (const receivedItem of receivedItems) {
      const {
        productId,
        product,
        quantityReceived,
        receivedQuantity,
        condition = 'good',
        batchNumber,
        notes: itemNotes
      } = receivedItem;

      // Handle both field name formats for compatibility
      const actualProductId = productId || product;
      const actualQuantityReceived = quantityReceived || receivedQuantity;

      // Validate product ID
      if (!actualProductId) {
        console.warn('Skipping item: missing product ID');
        results.errors.push('Missing product ID for received item');
        continue;
      }

      // Validate and parse quantity
      let validQuantity: number;
      try {
        validQuantity = Number(actualQuantityReceived);
        if (isNaN(validQuantity) || validQuantity <= 0) {
          console.warn(`Skipping item ${actualProductId}: invalid quantity ${actualQuantityReceived} (parsed as ${validQuantity})`);
          results.errors.push(`Invalid quantity for product ${actualProductId}: ${actualQuantityReceived}`);
          continue;
        }
      } catch (error) {
        console.warn(`Skipping item ${actualProductId}: could not parse quantity ${actualQuantityReceived}`);
        results.errors.push(`Could not parse quantity for product ${actualProductId}: ${actualQuantityReceived}`);
        continue;
      }

      // Find the corresponding item in the purchase order
      const poItem = order.items.find(item =>
        (typeof item.product === 'string' ? item.product : item.product._id).toString() === actualProductId.toString()
      );

      if (!poItem) {
        console.warn(`Product ${actualProductId} not found in purchase order ${order.poNumber}`);
        results.errors.push(`Product ${actualProductId} not found in purchase order`);
        continue;
      }

      // Initialize receivedQuantity if it doesn't exist
      if (!poItem.receivedQuantity) {
        poItem.receivedQuantity = 0;
      }

      // Check if receiving more than ordered quantity
      const newReceivedQuantity = poItem.receivedQuantity + validQuantity;
      if (newReceivedQuantity > poItem.quantity) {
        return next(new AppError(
          `Cannot receive more than ordered quantity for product ${actualProductId}. Ordered: ${poItem.quantity}, Already received: ${poItem.receivedQuantity}, Trying to receive: ${validQuantity}`,
          400
        ));
      }

      console.log("newReceivedQuantity:",newReceivedQuantity);
      // Update received quantity in PO
      poItem.receivedQuantity = newReceivedQuantity;

      console.log("poItem:",poItem);
      

      // Find or create stock record
      let stock = await Stock.findOne({
        product: new mongoose.Types.ObjectId(actualProductId),
        location: new mongoose.Types.ObjectId(location)
      });

      const currentTime = new Date();

      if (stock) {
        console.log("stock1:",stock);
        
        stock.quantity += validQuantity;
        stock.reservedQuantity = stock.reservedQuantity || 0;
        stock.availableQuantity = stock.quantity - stock.reservedQuantity;
        stock.lastUpdated = currentTime;
        
        const res = await stock.save();
        console.log("res:",res,"stock:",stock);
        
      } else {
        console.log("stock2:",stock);
       const ress = stock = await Stock.create({
          product: actualProductId,
          location: location,
          quantity: validQuantity,
          reservedQuantity: 0,
          availableQuantity: validQuantity,
          lastUpdated: currentTime
        });
        console.log("ress:",ress,"stock4:",stock);
      }


      // Generate unique reference ID for this specific receipt transaction
      const referenceId = await generateReferenceId('purchase_receipt');

      // Create StockLedger entry for traceability
      await StockLedger.create({
        product: actualProductId,
        location: location,
        transactionType: 'inward',
        quantity: validQuantity, // Use the validated quantity
        resultingQuantity: stock.quantity,
        reason: `Purchase Order Receipt - ${order.poNumber}`,
        referenceType: 'purchase_order',
        referenceId: referenceId, // Use unique reference ID
        performedBy: req.user!.id,
        transactionDate: receiptDate ? new Date(receiptDate) : new Date(),
        notes: itemNotes || notes || `Received from supplier: ${order.supplier}. PO: ${order.poNumber}, Product: ${typeof poItem.product === 'object' && 'name' in poItem.product ? poItem.product.name : actualProductId}`,
      });

    }

    // Calculate total quantities to determine PO status
    for (const item of order.items) {
      totalOrderedQuantity += item.quantity;
      totalReceivedQuantity += (item.receivedQuantity || 0);
    }

    // Update purchase order status based on received quantities
    if (totalReceivedQuantity === 0) {
      // No items received yet, keep current status
    } else if (totalReceivedQuantity >= totalOrderedQuantity) {
      // All items received
      order.status = 'received';
      order.actualDeliveryDate = receiptDate ? new Date(receiptDate) : new Date();
    } else {
      // Partial receipt
      order.status = 'partially_received';
      if (!order.actualDeliveryDate) {
        order.actualDeliveryDate = receiptDate ? new Date(receiptDate) : new Date();
      }
    }

    await order.save();

    // Populate the order with product details for frontend
    const populatedOrder = await PurchaseOrder.findById(order._id)
      .populate('items.product', 'name category brand modelNumber partNo price gst description ')
      .populate('createdBy', 'firstName lastName email');

    const transformedItems = (populatedOrder?.items || []).map((item: any) => ({
      product: item.product._id, // or item.product.id
      quantity: item.receivedQuantity ?? item.quantity, // use receivedQuantity if available
      unitPrice: item.unitPrice,
      description: item.product.name,
      taxRate: item.product.gst ?? 0
    }));

    const invoice = await createInvoiceFromPO({
      items: items,
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      dueDate: receiptDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      discountAmount: req.body.discountAmount || 0,
      notes: req.body.notes || "",
      terms: req.body.terms || "",
      invoiceType: 'sale',
      location: location,
      poNumber: order.poNumber,
      externalInvoiceNumber: externalInvoiceNumber,
      externalInvoiceTotal: externalInvoiceTotal
    });


    //  const invoice = await createInvoiceFromPO({
    //   items: populatedOrder?.items,
    //   customer: populatedOrder?.createdBy?.id,  // ensure customer field is passed
    //   dueDate: receiptDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // default 7 days
    //   discountAmount: req.body.discountAmount  || 0,
    //   notes: req.body.notes || "",
    //   terms: req.body.terms || "",
    //   invoiceType: 'purchase',
    //   location: location,
    // });

    // Check if we had any validation errors but still processed some items
    let message = `Items received successfully. ${order.status === 'received' ? 'Purchase order completed.' : `Partial receipt: ${totalReceivedQuantity}/${totalOrderedQuantity} items received.`}`;
    if (results.errors.length > 0) {
      message += ` Note: Some items had errors: ${results.errors.join('; ')}`;
    }

    const response: APIResponse = {
      success: true,
      message,
      data: {
        order: populatedOrder,
        receivedItems,
        totalOrderedQuantity,
        totalReceivedQuantity,
        status: populatedOrder!.status,
        message: 'Stock levels and ledger have been updated',
        errors: results.errors.length > 0 ? results.errors : undefined,
        invoice
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error receiving purchase order items:', error);
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

// @desc    Update purchase order status
// @route   PUT /api/v1/purchase-orders/:id/status
// @access  Private
export const updatePurchaseOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['sent', 'cancelled'],
      'sent': ['confirmed', 'cancelled'],
      'confirmed': ['received', 'partially_received', 'cancelled'],
      'partially_received': ['received', 'cancelled'],
      'received': [], // Cannot change from received
      'cancelled': [] // Cannot change from cancelled
    };

    if (!validTransitions[order.status].includes(status)) {
      return next(new AppError(`Cannot change status from ${order.status} to ${status}`, 400));
    }

    order.status = status;
    await order.save();

    const response: APIResponse = {
      success: true,
      message: `Purchase order status updated to ${status}`,
      data: order
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// helper functions to create invoice


const createInvoiceFromPO = async ({
  items,
  supplierName,
  supplierEmail,
  dueDate,
  discountAmount = 0,
  notes,
  terms,
  invoiceType,
  location,
  poNumber,
  reduceStock = true,
  externalInvoiceNumber,
  externalInvoiceTotal
}: {
  items: InvoiceItemInput[],
  supplierName: any,
  supplierEmail: any,
  dueDate: string,
  discountAmount?: number,
  notes?: string,
  terms?: string,
  invoiceType?: string,
  location: any,
  poNumber: string,
  reduceStock?: boolean,
  externalInvoiceNumber?: string,
  externalInvoiceTotal?: number
}) => {
  const invoiceNumber = externalInvoiceNumber;

  let calculatedItems = [];
  let subtotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found: ${item.product}`);
    }

    const itemTotal = item.quantity * item.unitPrice;
    const taxAmount = (item.taxRate || 0) * itemTotal / 100;

    calculatedItems.push({
      product: item.product,
      description: item.description || product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: itemTotal,
      taxRate: item.taxRate || 0,
      taxAmount: taxAmount
    });

    subtotal += itemTotal;
    totalTax += taxAmount;
  }

  const totalAmount = subtotal + totalTax - discountAmount;

  const invoice = new Invoice({
    invoiceNumber,
    supplierName,
    supplierEmail,
    issueDate: new Date(),
    dueDate: new Date(dueDate),
    items: calculatedItems,
    subtotal,
    taxAmount: totalTax,
    discountAmount,
    totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    status: 'draft',
    paymentStatus: 'pending',
    notes,
    terms,
    invoiceType,
    location,
    poNumber,
    externalInvoiceNumber,
    externalInvoiceTotal
  });

  await invoice.save();

  if (reduceStock) {
    for (const item of calculatedItems) {
      const stock = await Stock.findOne({ product: item.product, location });

      if (stock) {
        // stock.quantity -= item.quantity;
        // stock.availableQuantity = stock.quantity - stock.reservedQuantity;
        // await stock.save();

        // await StockLedger.create({
        //   product: item.product,
        //   location,
        //   transactionType: 'outward',
        //   quantity: -item.quantity,
        //   reason: `Invoice sale - ${invoiceNumber}`,
        //   notes: `Invoice created`,
        //   transactionDate: new Date(),
        //   resultingQuantity: stock.quantity,
        //   referenceId: invoiceNumber,
        //   referenceType: 'sale'
        // });
      }
    }
  }

  return invoice;
};
