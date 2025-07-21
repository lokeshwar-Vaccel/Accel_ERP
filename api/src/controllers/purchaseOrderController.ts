import { Response, NextFunction } from 'express';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Stock } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Product } from '../models/Product';
import { Invoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import mongoose, { Types } from 'mongoose';
import { sendEmail } from '../utils/email';

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
    // Validate supplierAddress
    // if (!req.body.supplierAddress || !req.body.supplierAddress.address || !req.body.supplierAddress.state || !req.body.supplierAddress.district || !req.body.supplierAddress.pincode) {
    //   return next(new AppError('Supplier address (address, state, district, pincode) is required', 400));
    // }
    // Handle supplier data from customers collection
    let supplierName = req.body.supplier;
    let supplierEmail = req.body.supplierEmail;

    // If supplier is an ObjectId, fetch supplier details from customers collection
    if (mongoose.Types.ObjectId.isValid(req.body.supplier)) {
      const supplier = await Customer.findById(req.body.supplier);
      if (!supplier) {
        return next(new AppError('Supplier not found', 404));
      }
      
      // Use supplier details from customers collection
      supplierName = supplier.name;
      supplierEmail = supplier.email || req.body.supplierEmail;
    }

    // Calculate total amount from items (including taxRate)
    let totalAmount = 0;
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const taxRate = item.taxRate || 0;
        const itemTotal = quantity * unitPrice * (1 + taxRate / 100);
        totalAmount += itemTotal;
      }
    }

    // Prepare order data
    const orderData = {
      ...req.body,
      supplier: supplierName, // Use the resolved supplier name
      supplierEmail: supplierEmail, // Use the resolved supplier email
      totalAmount,
      createdBy: req.user!.id,
      orderDate: new Date(),
      supplierAddress: req.body.supplierAddress // ensure supplierAddress is saved
    };

    // Convert date strings to Date objects for new fields
    if (req.body.shipDate) {
      orderData.shipDate = new Date(req.body.shipDate);
    }
    if (req.body.invoiceDate) {
      orderData.invoiceDate = new Date(req.body.invoiceDate);
    }
    if (req.body.documentDate) {
      orderData.documentDate = new Date(req.body.documentDate);
    }
    
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
    // Validate supplierAddress if present
    // if (req.body.supplierAddress && (!req.body.supplierAddress.address || !req.body.supplierAddress.state || !req.body.supplierAddress.district || !req.body.supplierAddress.pincode)) {
    //   return next(new AppError('Supplier address (address, state, district, pincode) is required', 400));
    // }

    // Handle supplier data from customers collection
    let supplierName = req.body.supplier;
    let supplierEmail = req.body.supplierEmail;

    // If supplier is an ObjectId, fetch supplier details from customers collection
    if (req.body.supplier && mongoose.Types.ObjectId.isValid(req.body.supplier)) {
      const supplier = await Customer.findById(req.body.supplier);
      if (!supplier) {
        return next(new AppError('Supplier not found', 404));
      }
      
      // Use supplier details from customers collection
      supplierName = supplier.name;
      supplierEmail = supplier.email || req.body.supplierEmail;
    }

    // Recalculate total if items are updated
    if (req.body.items) {
      let totalAmount = 0;
      for (const item of req.body.items) {
        const quantity = item.quantity || 0;
        const unitPrice = item.unitPrice || 0;
        const taxRate = item.taxRate || 0;
        const itemTotal = quantity * unitPrice * (1 + taxRate / 100);
        totalAmount += itemTotal;
      }
      req.body.totalAmount = totalAmount;
    }

    // Update supplier information
    if (supplierName) {
      req.body.supplier = supplierName;
    }
    if (supplierEmail) {
      req.body.supplierEmail = supplierEmail;
    }
    if (req.body.supplierAddress) {
      req.body.supplierAddress = req.body.supplierAddress; // ensure supplierAddress is saved
    }

    // Convert date strings to Date objects for new fields
    if (req.body.shipDate) {
      req.body.shipDate = new Date(req.body.shipDate);
    }
    if (req.body.invoiceDate) {
      req.body.invoiceDate = new Date(req.body.invoiceDate);
    }
    if (req.body.documentDate) {
      req.body.documentDate = new Date(req.body.documentDate);
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
    const { 
      receivedItems, 
      location, 
      receiptDate, 
      inspectedBy, 
      notes, 
      externalInvoiceTotal, 
      supplierName, 
      supplierEmail,
      supplierAddress,
      items,
      // New shipping and documentation fields
      shipDate,
      docketNumber,
      noOfPackages,
      gstInvoiceNumber,
      invoiceDate,
      documentNumber,
      documentDate
    } = req.body;

    const order = await PurchaseOrder.findById(req.params.id)
    .populate('items.product', 'name category brand partNo');

    if (!order) {
      return next(new AppError('Purchase order not found', 404));
    }

    if (!['confirmed', 'partially_received'].includes(order.status)) {
      return next(new AppError('Purchase order must be confirmed before receiving items', 400));
    }

    let totalOrderedQuantity = 0;
    let totalReceivedQuantity = 0;
    const results: { errors: string[] } = { errors: [] };

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

      // Update received quantity in PO
      poItem.receivedQuantity = newReceivedQuantity;

      // Find or create stock record
      let stock = await Stock.findOne({
        product: new mongoose.Types.ObjectId(actualProductId),
        location: new mongoose.Types.ObjectId(location)
      });

      const currentTime = new Date();

      if (stock) {
        
        stock.quantity += validQuantity;
        stock.reservedQuantity = stock.reservedQuantity || 0;
        stock.availableQuantity = stock.quantity - stock.reservedQuantity;
        stock.lastUpdated = currentTime;
        
        const res = await stock.save();
        
      } else {
       const ress = stock = await Stock.create({
          product: actualProductId,
          location: location,
          quantity: validQuantity,
          reservedQuantity: 0,
          availableQuantity: validQuantity,
          lastUpdated: currentTime
        });
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

    // Save shipping and documentation fields to the purchase order
    if (shipDate) order.shipDate = new Date(shipDate);
    if (docketNumber) order.docketNumber = docketNumber;
    if (noOfPackages) order.noOfPackages = noOfPackages;
    if (gstInvoiceNumber) order.gstInvoiceNumber = gstInvoiceNumber;
    if (invoiceDate) order.invoiceDate = new Date(invoiceDate);
    if (documentNumber) order.documentNumber = documentNumber;
    if (documentDate) order.documentDate = new Date(documentDate);

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
      gstInvoiceNumber: gstInvoiceNumber,
      supplierName: supplierName,
      supplierEmail: supplierEmail,
      supplierAddress: supplierAddress,
      dueDate: receiptDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      discountAmount: req.body.discountAmount || 0,
      notes: req.body.notes || "",
      terms: req.body.terms || "",
      invoiceType: 'purchase',
      location: location,
      poNumber: order.poNumber,
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

    // Send email to supplier if status is changed to 'sent'
    if (status === 'sent' && order.supplierEmail) {
      const subject = `Purchase Order ${order.poNumber} Sent`;
      const html = `<p>Dear Supplier,</p>
        <p>Your purchase order <strong>${order.poNumber}</strong> has been sent.</p>
        <p>Thank you.</p>`;
      sendEmail(order.supplierEmail, subject, html)
        .catch((err) => {
          console.error('Error sending PO email:', err);
        });
    }

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
  gstInvoiceNumber,
  supplierEmail,
  supplierAddress,
  dueDate,
  discountAmount = 0,
  notes,
  terms,
  invoiceType,
  location,
  poNumber,
  reduceStock = true,
  externalInvoiceTotal
}: {
  items: InvoiceItemInput[],
  supplierName: any,
  supplierEmail: any,
  supplierAddress: any,
  dueDate: string,
  discountAmount?: number,
  notes?: string,
  terms?: string,
  invoiceType?: string,
  location: any,
  poNumber: string,
  reduceStock?: boolean,
  externalInvoiceTotal?: number,
  gstInvoiceNumber: string
}) => {
  const invoiceNumber = gstInvoiceNumber;

  console.log("supplierAddress-99992:", supplierAddress);

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

  function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}
let ans = roundTo2(totalTax)

const totalAmount = Number((Number(subtotal) + Number(ans)).toFixed(2)) - discountAmount;

  const invoice = new Invoice({
    invoiceNumber,
    supplierName,
    supplierEmail,  
    supplierAddress,
    issueDate: new Date(),
    dueDate: new Date(dueDate),
    items: calculatedItems,
    subtotal,
    taxAmount: totalTax.toFixed(2),
    discountAmount,
    totalAmount:totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    status: 'draft',
    paymentStatus: 'pending',
    notes,
    terms,
    invoiceType,
    location,
    poNumber,
    externalInvoiceTotal
  });

 let myInvoice = await invoice.save();

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
