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
      totalPurchaseOrdersStatus,
      pendingPurchaseOrdersStatus,
      confirmedPurchaseOrdersStatus,
      dateTo
    } = req.query as QueryParams & {
      status?: PurchaseOrderStatus;
      supplier?: string;
      dateFrom?: string;
      dateTo?: string;
      totalPurchaseOrdersStatus?: string;
      pendingPurchaseOrdersStatus?: string;
      confirmedPurchaseOrdersStatus?: string;
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

    if (totalPurchaseOrdersStatus) {
      query.status = totalPurchaseOrdersStatus;
    }

    if (pendingPurchaseOrdersStatus) {
      query.status = pendingPurchaseOrdersStatus;
    }

    if (confirmedPurchaseOrdersStatus) {
      query.status = confirmedPurchaseOrdersStatus;
    }

    // Execute query with pagination
    const orders = await PurchaseOrder.find(query)
      .populate('items.product', 'name category brand modelNumber partNo price gst')
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await PurchaseOrder.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));
    const totalPurchaseOrdersCount = await PurchaseOrder.countDocuments();
    const pendingPurchaseOrdersCount = await PurchaseOrder.countDocuments({ status: 'draft' });
    const confirmedPurchaseOrdersCount = await PurchaseOrder.countDocuments({ status: 'confirmed' });

    const response: APIResponse = {
      success: true,
      message: 'Purchase orders retrieved successfully',
      data: { orders },
      totalPurchaseOrdersCount: totalPurchaseOrdersCount,
      pendingPurchaseOrdersCount: pendingPurchaseOrdersCount,
      confirmedPurchaseOrdersCount: confirmedPurchaseOrdersCount,
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
      .populate('items.product', 'name category brand modelNumber partNo specifications price gst hsnNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses');

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
    let supplier = req.body.supplier;
    let supplierEmail = req.body.supplierEmail;
    console.log("req.body:",req.body);
    

    // If supplier is an ObjectId, fetch supplier details from customers collection
    if (mongoose.Types.ObjectId.isValid(req.body.supplier)) {
      const supplierResolved = await Customer.findById(req.body.supplier);
      if (!supplierResolved) {
        return next(new AppError('Supplier not found', 404));
      }
      
      // Use supplier details from customers collection
      supplier = supplierResolved._id;
      supplierEmail = supplierResolved.email || req.body.supplierEmail;
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
      supplier: supplier, // Use the resolved supplier name
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
      .populate('items.product', 'name category brand modelNumber partNo price gst hsnNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses');

    
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
    let supplier = req.body.supplier;
    let supplierEmail = req.body.supplierEmail;
    console.log("req.body:",req.body);
    

    // If supplier is an ObjectId, fetch supplier details from customers collection
    if (req.body.supplier && mongoose.Types.ObjectId.isValid(req.body.supplier)) {
      const supplierResolved = await Customer.findById(req.body.supplier);
      if (!supplierResolved) {
        return next(new AppError('Supplier not found', 404));
      }
      
      // Use supplier details from customers collection
      supplier = supplierResolved._id;
      supplierEmail = supplierResolved.email || req.body.supplierEmail;
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
    if (supplier) {
      req.body.supplier = supplier;
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
      .populate('items.product', 'name category brand partNo hsnNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses');

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
    const order = await PurchaseOrder.findById(req.params.id)
    .populate('items.product', 'name category brand partNo hsnNumber')
    .populate('createdBy', 'firstName lastName email')
    .populate('supplier', 'name email addresses');
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

// @desc    Check if GST Invoice Number already exists
// @route   GET /api/v1/purchase-orders/check-gst-invoice/:gstInvoiceNumber
// @access  Private
export const checkGstInvoiceNumber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { gstInvoiceNumber } = req.params;

    if (!gstInvoiceNumber || gstInvoiceNumber.trim() === '') {
      return next(new AppError('GST Invoice Number is required', 400));
    }

    // Check in Purchase Orders
    const existingPO = await PurchaseOrder.findOne({ 
      gstInvoiceNumber: gstInvoiceNumber.trim() 
    });

    // Check in Invoices (for purchase invoices)
    const existingInvoice = await Invoice.findOne({ 
      invoiceNumber: gstInvoiceNumber.trim(),
      invoiceType: 'purchase'
    });

    const exists = !!(existingPO || existingInvoice);

    const response: APIResponse = {
      success: true,
      message: exists ? 'GST Invoice Number already exists' : 'GST Invoice Number is available',
      data: { 
        exists,
        gstInvoiceNumber: gstInvoiceNumber.trim(),
        foundIn: existingPO ? 'purchase_order' : existingInvoice ? 'invoice' : null
      }
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
      supplier, 
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
    .populate('items.product', 'name category brand partNo')
    .populate('createdBy', 'firstName lastName email')
    .populate('supplier', 'name email addresses');

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

      const originalQuantity = stock?.quantity ?? 0;

      const currentTime = new Date();

      if (stock) {
        
        stock.quantity += validQuantity;
        stock.reservedQuantity = stock.reservedQuantity || 0;
        stock.availableQuantity = stock.quantity - stock.reservedQuantity;
        stock.lastUpdated = currentTime;
        
        const res = await stock.save();
        
        // 🔔 AUTOMATIC NOTIFICATION TRIGGER
        // Check if stock increase requires notification and send real-time alert
        try {
          const { Product } = await import('../models/Product');
          const { notificationService } = await import('../services/notificationService');
          
          const product = await Product.findById(actualProductId);
          if (product) {
            const currentStock = stock.availableQuantity;
            const minStockLevel = product.minStockLevel || 0;
            const maxStockLevel = product.maxStockLevel || 0;

            // Check if we're now overstocked
            let notificationType: 'over_stock' | null = null;
            let threshold = 0;

            if (maxStockLevel > 0 && currentStock > maxStockLevel) {
              notificationType = 'over_stock';
              threshold = maxStockLevel;
            }

            // If notification is needed, send it via WebSocket
            if (notificationType) {
              console.log(`🔔 Purchase order receipt triggered ${notificationType} notification for product: ${product.name}`);
              
              // Get location details
              const { StockLocation } = await import('../models/Stock');
              const { Room } = await import('../models/Stock');
              const { Rack } = await import('../models/Stock');
              
              const stockLocation = await StockLocation.findById(location);
              const room = stock.room ? await Room.findById(stock.room) : null;
              const rack = stock.rack ? await Rack.findById(stock.rack) : null;

              // Create real-time notification
                await notificationService.createInventoryNotification(
                  notificationType,
                  actualProductId.toString(),
                  product.name,
                  product.partNo || 'N/A',
                  currentStock,
                  threshold,
                  stockLocation?.name || 'Unknown',
                  room?.name,
                  rack?.name
                );

              console.log(`✅ Real-time ${notificationType} notification sent for ${product.name}`);
            }
          }
        } catch (error) {
          // Don't let notification errors break the purchase order operation
          console.error('❌ Error in automatic purchase order stock notification:', error);
        }
        
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
        previousQuantity: originalQuantity,
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
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses');

    // Calculate the total value of items being received in this receipt
    const receiptTotalValue = receivedItems.reduce((sum: number, receivedItem: any) => {
      const actualProductId = receivedItem.productId || receivedItem.product;
      const actualQuantityReceived = receivedItem.quantityReceived || receivedItem.receivedQuantity;
      
      const poItem = order.items.find(poItem => {
        const poProductId = typeof poItem.product === 'string' ? poItem.product : poItem.product._id;
        return poProductId.toString() === actualProductId.toString();
      });
      
      if (poItem) {
        const itemTotal = actualQuantityReceived * poItem.unitPrice;
        const taxAmount = (poItem.taxRate || 0) * itemTotal / 100;
        return sum + itemTotal + taxAmount;
      }
      return sum;
    }, 0);

    // Determine if this is a partial or full receipt
    const isPartialReceipt = totalReceivedQuantity < totalOrderedQuantity;
    const isFullReceipt = totalReceivedQuantity >= totalOrderedQuantity;

    // Create invoice for the received items
    let invoice = null;
    if (gstInvoiceNumber) {
      console.log("Creating invoice for PO:", order.poNumber);
      console.log("PO Payment Status:", order.paymentStatus);
      console.log("PO Paid Amount:", order.paidAmount);
      console.log("PO Remaining Amount:", order.remainingAmount);
      console.log("External Invoice Total:", externalInvoiceTotal);
      console.log("Received Items:", receivedItems);
      console.log("Order Items:", order.items);
      
      const transformedItems = receivedItems.map((receivedItem: any) => {
        const actualProductId = receivedItem.productId || receivedItem.product;
        const actualQuantityReceived = receivedItem.quantityReceived || receivedItem.receivedQuantity;
        
        // Find the corresponding PO item to get unit price and tax rate
        const poItem = order.items.find(poItem => {
          const poProductId = typeof poItem.product === 'string' ? poItem.product : poItem.product._id;
          return poProductId.toString() === actualProductId.toString();
        });
        
        if (!poItem) {
          console.warn(`PO item not found for product ${actualProductId}`);
          return null;
        }
        
        const unitPrice = poItem.unitPrice || 0;
        const taxRate = poItem.taxRate || 0;
        
        console.log("Transforming received item:", {
          product: actualProductId,
          quantity: actualQuantityReceived,
          unitPrice,
          taxRate,
          itemTotal: actualQuantityReceived * unitPrice,
          taxAmount: (actualQuantityReceived * unitPrice * taxRate) / 100
        });
        
        return {
          product: actualProductId,
          quantity: actualQuantityReceived,
          unitPrice,
          description: (typeof poItem.product === 'object' && 'name' in poItem.product ? poItem.product.name : '') || '',
          taxRate
        };
      }).filter(Boolean); // Remove any null items

      console.log("Transformed items for invoice:", transformedItems);

      if (transformedItems.length === 0) {
        console.warn("No valid items to create invoice for");
      } else {
        // Calculate the total value of items being received in this receipt
        const receiptTotalValue = transformedItems.reduce((sum: number, item: any) => {
          return sum + (item.quantity * item.unitPrice) + ((item.quantity * item.unitPrice * item.taxRate) / 100);
        }, 0);

        console.log("Receipt total value for invoice:", receiptTotalValue);
        console.log("PO paid amount:", order.paidAmount);
        console.log("Note: Paid amount will reflect actual amount paid to supplier, not proportional to received items");

        invoice = await createInvoiceFromPO({
          items: transformedItems,
          gstInvoiceNumber: gstInvoiceNumber,
          supplier: order.supplier,
          supplierEmail: supplierEmail,
          supplierAddress: supplierAddress,
          dueDate: receiptDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          discountAmount: req.body.discountAmount || 0,
          notes: req.body.notes || "",
          terms: req.body.terms || "",
          invoiceType: 'purchase',
          location: location,
          poNumber: order.poNumber,
          externalInvoiceTotal: externalInvoiceTotal,
          poPaymentInfo: {
            poPaidAmount: order.paidAmount || 0,
            poRemainingAmount: order.remainingAmount || 0,
            poPaymentStatus: order.paymentStatus || 'pending'
          }
        });

        console.log("Invoice created successfully:", {
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.remainingAmount,
          paymentStatus: invoice.paymentStatus,
          note: `Invoice amount: ₹${invoice.totalAmount}, Paid amount: ₹${invoice.paidAmount} (actual amount paid to supplier)`
        });
      }
    }

    // Check if we had any validation errors but still processed some items
    let message = `Items received successfully. ${order.status === 'received' ? 'Purchase order completed.' : `Partial receipt: ${totalReceivedQuantity}/${totalOrderedQuantity} items received.`}`;
    if (results.errors.length > 0) {
      message += ` Note: Some items had errors: ${results.errors.join('; ')}`;
    }

    // Add invoice information to the message
    if (invoice) {
      message += ` Purchase invoice ${invoice.invoiceNumber} created with ${invoice.paymentStatus} payment status.`;
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
        invoice,
        receiptSummary: {
          totalValue: receiptTotalValue,
          isPartialReceipt,
          isFullReceipt,
          receiptDate: receiptDate || new Date(),
          gstInvoiceNumber
        }
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

    const order = await PurchaseOrder.findById(req.params.id)
    .populate('items.product', 'name category brand partNo hsnNumber')
    .populate('createdBy', 'firstName lastName email')
    .populate('supplier', 'name email addresses');
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

// @desc    Update purchase order payment
// @route   PUT /api/v1/purchase-orders/:id/payment
// @access  Private
export const updatePurchaseOrderPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      paidAmount, 
      paymentMethod, 
      paymentDate, 
      notes 
    } = req.body;

    // Validate required fields
    if (paidAmount === undefined || paidAmount < 0) {
      return next(new AppError('Valid payment amount is required', 400));
    }

    // Find the purchase order
    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return next(new AppError('Purchase order not found', 404));
    }

    // Calculate new total paid amount (existing + new payment)
    const existingPaidAmount = purchaseOrder.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + paidAmount;
    
    // Calculate remaining amount
    const totalAmount = purchaseOrder.totalAmount || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    // Determine payment status
    let newPaymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
    if (newTotalPaidAmount === 0) {
      newPaymentStatus = 'pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partial';
    }

    // Update the purchase order
    const updatedPurchaseOrder = await PurchaseOrder.findByIdAndUpdate(
      id,
      {
        paidAmount: newTotalPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        paymentMethod,
        notes: notes || purchaseOrder.notes,
        ...(purchaseOrder.status === 'draft' && newTotalPaidAmount > 0 && { status: 'sent' })
      },
      { new: true, runValidators: true }
    )
      .populate('items.product', 'name category brand partNo hsnNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('supplier', 'name email addresses');

    // Update related invoices if they exist
    if (updatedPurchaseOrder) {
      await updateRelatedInvoicesPaymentStatus(updatedPurchaseOrder.poNumber, newTotalPaidAmount, totalAmount);
    }

    const response: APIResponse = {
      success: true,
      message: 'Purchase order payment updated successfully',
      data: { order: updatedPurchaseOrder }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Helper function to update related invoices payment status
const updateRelatedInvoicesPaymentStatus = async (poNumber: string, poPaidAmount: number, poTotalAmount: number) => {
  try {
    // Find all invoices related to this PO
    const relatedInvoices = await Invoice.find({ poNumber, invoiceType: 'purchase' });
    
    if (relatedInvoices.length === 0) return;

    console.log(`Updating payment status for ${relatedInvoices.length} invoices related to PO: ${poNumber}`);
    console.log(`PO Paid Amount: ₹${poPaidAmount}, PO Total Amount: ₹${poTotalAmount}`);

    // Use actual paid amount, not proportional distribution
    // This reflects what was actually paid to the supplier
    for (const invoice of relatedInvoices) {
      let newPaidAmount = 0;
      let newRemainingAmount = invoice.totalAmount;
      let newPaymentStatus = 'pending';

      if (poPaidAmount > 0) {
        // If PO has any payment, use that as paid amount for this invoice
        // But don't exceed the invoice total amount
        newPaidAmount = Math.min(poPaidAmount, invoice.totalAmount);
        newRemainingAmount = invoice.totalAmount - newPaidAmount;
        
        // Determine payment status based on this invoice's amounts
        if (newPaidAmount >= invoice.totalAmount) {
          newPaymentStatus = 'paid';
          newRemainingAmount = 0;
        } else if (newPaidAmount > 0) {
          newPaymentStatus = 'partial';
        } else {
          newPaymentStatus = 'pending';
        }
      } else {
        // No payment made yet
        newPaidAmount = 0;
        newRemainingAmount = invoice.totalAmount;
        newPaymentStatus = 'pending';
      }

      console.log(`Invoice ${invoice.invoiceNumber}: Amount: ₹${invoice.totalAmount}, Paid: ₹${newPaidAmount}, Remaining: ₹${newRemainingAmount}, Status: ${newPaymentStatus}`);

      // Update invoice payment status
      await Invoice.findByIdAndUpdate(invoice._id, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      });
    }

    console.log(`Successfully updated payment status for all invoices related to PO: ${poNumber}`);
  } catch (error) {
    console.error('Error updating related invoices payment status:', error);
  }
};

// Helper function to sync PO payment status from invoice payments
export const syncPOPaymentStatusFromInvoices = async (poNumber: string) => {
  try {
    // Find all invoices related to this PO
    const relatedInvoices = await Invoice.find({ poNumber, invoiceType: 'purchase' });
    
    if (relatedInvoices.length === 0) return;

    // Calculate total paid amount across all invoices
    const totalInvoicePaidAmount = relatedInvoices.reduce((sum, invoice) => sum + (invoice.paidAmount || 0), 0);
    const totalInvoiceAmount = relatedInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

    // Find the PO
    const purchaseOrder = await PurchaseOrder.findOne({ poNumber });
    if (!purchaseOrder) return;

    // Update PO payment status based on invoice payments
    let newPaymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
    if (totalInvoicePaidAmount >= totalInvoiceAmount) {
      newPaymentStatus = 'paid';
    } else if (totalInvoicePaidAmount > 0) {
      newPaymentStatus = 'partial';
    } else {
      newPaymentStatus = 'pending';
    }

    // Update PO payment status
    await PurchaseOrder.findByIdAndUpdate(purchaseOrder._id, {
      paidAmount: totalInvoicePaidAmount,
      remainingAmount: Math.max(0, totalInvoiceAmount - totalInvoicePaidAmount),
      paymentStatus: newPaymentStatus
    });

    return { success: true, message: 'PO payment status synced from invoices' };
  } catch (error) {
    console.error('Error syncing PO payment status from invoices:', error);
    return { success: false, message: 'Failed to sync PO payment status' };
  }
};

// helper functions to create invoice


const createInvoiceFromPO = async ({
  items,
  supplier,
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
  externalInvoiceTotal,
  poPaymentInfo
}: {
  items: InvoiceItemInput[],
  supplier: any,
  gstInvoiceNumber: string,
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
  poPaymentInfo?: {
    poPaidAmount: number;
    poRemainingAmount: number;
    poPaymentStatus: string;
  }
}) => {
  const invoiceNumber = gstInvoiceNumber;

  console.log("Creating invoice from PO:", { poNumber, gstInvoiceNumber, externalInvoiceTotal });

  let calculatedItems = [];
  let subtotal = 0;
  let totalTax = 0;

  // Calculate items and totals
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new Error(`Product not found: ${item.product}`);
    }

    const itemTotal = item.quantity * item.unitPrice;
    const taxAmount = ((item.taxRate || 0) * itemTotal) / 100;

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

  // Use external invoice total if provided, otherwise calculate from items
  let finalTotalAmount: number;
  let finalSubtotal: number;
  let finalTaxAmount: number;

  if (externalInvoiceTotal && externalInvoiceTotal > 0) {
    // Use external invoice total
    finalTotalAmount = subtotal + totalTax - discountAmount;
    finalSubtotal = subtotal;
    finalTaxAmount = totalTax;
    
    // // Adjust discount if needed to match external total
    // const calculatedTotal = subtotal + totalTax - discountAmount;
    // if (Math.abs(calculatedTotal - externalInvoiceTotal) > 0.01) {
    //   // Adjust discount to match external total
    //   const newDiscountAmount = (subtotal + totalTax) - externalInvoiceTotal;
    //   discountAmount = Math.max(0, newDiscountAmount);
    // }
  } else {
    // Calculate from items
    finalSubtotal = subtotal;
    finalTaxAmount = totalTax;
    finalTotalAmount = subtotal + totalTax - discountAmount;
  }

  // Ensure amounts are properly rounded
  finalTotalAmount = Math.round(finalTotalAmount * 100) / 100;
  finalSubtotal = Math.round(finalSubtotal * 100) / 100;
  finalTaxAmount = Math.round(finalTaxAmount * 100) / 100;
  discountAmount = Math.round(discountAmount * 100) / 100;

  console.log("Calculated amounts:", {
    subtotal: finalSubtotal,
    taxAmount: finalTaxAmount,
    discountAmount,
    totalAmount: finalTotalAmount
  });

  // Calculate payment amounts based on PO payment status
  let paidAmount = 0;
  let remainingAmount = finalTotalAmount;
  let paymentStatus = 'pending';

  if (poPaymentInfo) {
    const { poPaidAmount, poRemainingAmount, poPaymentStatus } = poPaymentInfo;
    
    console.log("PO Payment Info:", { poPaidAmount, poRemainingAmount, poPaymentStatus });
    
    // Use the actual paid amount from PO, not proportional calculation
    // This reflects what was actually paid to the supplier
    if (poPaidAmount > 0) {
      // If PO has any payment, use that as paid amount for this invoice
      // But don't exceed the invoice total amount
      paidAmount = Math.min(poPaidAmount, finalTotalAmount);
      remainingAmount = finalTotalAmount - paidAmount;
      
      // Determine payment status based on this invoice's amounts
      if (paidAmount >= finalTotalAmount) {
        paymentStatus = 'paid';
        remainingAmount = 0;
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'pending';
      }
    } else {
      // No payment made yet
      paidAmount = 0;
      remainingAmount = finalTotalAmount;
      paymentStatus = 'pending';
    }
  }

  console.log("Final payment amounts:", {
    paidAmount,
    remainingAmount,
    paymentStatus,
    note: "Paid amount reflects actual amount paid to supplier, not proportional to received items"
  });

  // Create invoice object with all required fields
  const invoiceData: any = {
    invoiceNumber,
    supplier,
    supplierEmail,  
    supplierAddress,
    issueDate: new Date(),
    dueDate: new Date(dueDate),
    items: calculatedItems,
    subtotal: finalSubtotal,
    taxAmount: finalTaxAmount,
    discountAmount,
    totalAmount: finalTotalAmount,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    status: 'draft',
    paymentStatus: paymentStatus,
    notes: notes ? `${notes}\n\nCreated from PO: ${poNumber}` : `Created from PO: ${poNumber}`,
    terms,
    invoiceType: invoiceType || 'purchase',
    location,
    poNumber,
    externalInvoiceTotal,
    // Flag to prevent pre-save middleware from recalculating amounts for purchase invoices
    _skipAmountRecalculation: true
  };

  // Add required fields for Invoice model
  if (supplier && typeof supplier === 'object' && supplier._id) {
    invoiceData.user = supplier._id; // Use supplier as user for purchase invoices
    invoiceData.customer = supplier._id; // Use supplier as customer for purchase invoices
  }

  console.log("Creating invoice with data:", invoiceData);

  const invoice = new Invoice(invoiceData);
  const savedInvoice = await invoice.save();

  console.log("Invoice created successfully:", savedInvoice._id);

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

  return savedInvoice;
};
