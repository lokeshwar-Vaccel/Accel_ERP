import { Request, Response, NextFunction } from 'express';
import { DeliveryChallan, IDeliveryChallan, IDeliveryChallanItem } from '../models/DeliveryChallan';
import { Stock, StockLocation, Room, Rack } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId, generateDeliveryChallanNumber } from '../utils/generateReferenceId';
import { generateDeliveryChallanPDF } from '../utils/deliveryChallanPdf';

// @desc    Get all delivery challans
// @route   GET /api/v1/delivery-challans
// @access  Private
export const getDeliveryChallans = async (
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
      customer,
      dateFrom,
      dateTo,
      department
    } = req.query as QueryParams & {
      status?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      department?: string;
    };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (department) query.department = department;

    if (dateFrom || dateTo) {
      query.dated = {};
      if (dateFrom) query.dated.$gte = new Date(dateFrom);
      if (dateTo) query.dated.$lte = new Date(dateTo);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { challanNumber: { $regex: search, $options: 'i' } },
        { referenceNo: { $regex: search, $options: 'i' } },
        { buyersOrderNo: { $regex: search, $options: 'i' } },
        { dispatchDocNo: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const deliveryChallans = await DeliveryChallan.find(query)
      .populate('customer', 'name email phone address')
      .populate('createdBy', 'firstName lastName')
      .sort(sort as string)
      .skip(skip)
      .limit(Number(limit));

    const total = await DeliveryChallan.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'Delivery challans retrieved successfully',
      data: {
        deliveryChallans,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single delivery challan
// @route   GET /api/v1/delivery-challans/:id
// @access  Private
export const getDeliveryChallan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deliveryChallan = await DeliveryChallan.findById(req.params.id)
      .populate('customer', 'name email phone address customerType addresses')
      .populate('createdBy', 'firstName lastName email');

    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan retrieved successfully',
      data: { deliveryChallan }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new delivery challan
// @route   POST /api/v1/delivery-challans
// @access  Private
export const createDeliveryChallan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      customer,
      location,
      spares,
      services,
      dated,
      modeOfPayment,
      department,
      referenceNo,
      otherReferenceNo,
      buyersOrderNo,
      buyersOrderDate,
      dispatchDocNo,
      destination,
      dispatchedThrough,
      termsOfDelivery,
      consignee,
      notes
    } = req.body;

    // Clean up empty string fields
    const cleanModeOfPayment = modeOfPayment && modeOfPayment.trim() !== '' ? modeOfPayment : undefined;
    const cleanReferenceNo = referenceNo && referenceNo.trim() !== '' ? referenceNo : undefined;
    const cleanOtherReferenceNo = otherReferenceNo && otherReferenceNo.trim() !== '' ? otherReferenceNo : undefined;
    const cleanBuyersOrderNo = buyersOrderNo && buyersOrderNo.trim() !== '' ? buyersOrderNo : undefined;
    const cleanDispatchDocNo = dispatchDocNo && dispatchDocNo.trim() !== '' ? dispatchDocNo : undefined;
    const cleanTermsOfDelivery = termsOfDelivery && termsOfDelivery.trim() !== '' ? termsOfDelivery : undefined;
    const cleanNotes = notes && notes.trim() !== '' ? notes : undefined;

    // Generate challan number if not provided
    let challanNumber = req.body.challanNumber;
    if (!challanNumber) {
      challanNumber = await generateDeliveryChallanNumber();
    }

    // Validate required fields
    if (!customer) {
      return next(new AppError('Customer is required', 400));
    }

    if (!department) {
      return next(new AppError('Department is required', 400));
    }

    if (!destination) {
      return next(new AppError('Destination is required', 400));
    }

    // dispatchedThrough is now optional

    // Spares and services are optional; allow creation without either

    // Validate spares and check stock availability when provided
    if (spares && spares.length > 0) {
      for (let i = 0; i < spares.length; i++) {
        const item = spares[i];
        if (!item.description) {
          return next(new AppError(`Spare item ${i + 1} description is required`, 400));
        }
        if (item.quantity <= 0) {
          return next(new AppError(`Spare item ${i + 1} quantity must be greater than 0`, 400));
        }
        // If product ID is provided, validate stock availability
        if (item.product) {
          // Check if we have stock allocation data from frontend
          if (item.stockAllocation && item.stockAllocation.allocations) {
            // Use the sequential allocation logic from frontend
            if (!item.stockAllocation.canFulfill) {
              const totalAvailable = item.stockAllocation.allocations.reduce((sum: number, alloc: any) => sum + alloc.availableQuantity, 0);
              return next(new AppError(`Insufficient stock for ${item.description}. Available: ${totalAvailable}, Requested: ${item.quantity}`, 400));
            }
            
            // Validate each allocation against actual stock
            for (const allocation of item.stockAllocation.allocations) {
              console.log('🔍 Validating allocation:', {
                product: item.product,
                location: allocation.location,
                room: allocation.room,
                rack: allocation.rack,
                allocatedQuantity: allocation.allocatedQuantity
              });
              
              // Find the ObjectIds for location, room, and rack
              const location = await StockLocation.findOne({ name: allocation.location });
              const room = await Room.findOne({ name: allocation.room, location: location?._id });
              const rack = await Rack.findOne({ name: allocation.rack, room: room?._id });
              
              console.log('🔍 Found references:', {
                location: location ? { id: location._id, name: location.name } : null,
                room: room ? { id: room._id, name: room.name } : null,
                rack: rack ? { id: rack._id, name: rack.name } : null
              });
              
              if (!location || !room || !rack) {
                return next(new AppError(`Stock not found for ${item.description} at ${allocation.location} - ${allocation.room} - ${allocation.rack}`, 400));
              }
              
              // Find stock using ObjectIds
              const stock = await Stock.findOne({ 
                product: item.product,
                location: location._id,
                room: room._id,
                rack: rack._id
              });
              
              console.log('🔍 Found stock:', stock ? {
                id: stock._id,
                quantity: stock.quantity,
                reservedQuantity: stock.reservedQuantity,
                availableQuantity: stock.quantity - (stock.reservedQuantity || 0)
              } : null);
              
              if (!stock) {
                return next(new AppError(`Stock not found for ${item.description} at ${allocation.location} - ${allocation.room} - ${allocation.rack}`, 400));
              }
              
              const availableQuantity = stock.quantity - (stock.reservedQuantity || 0);
              if (availableQuantity < allocation.allocatedQuantity) {
                return next(new AppError(`Insufficient stock for ${item.description} at ${allocation.location} - ${allocation.room} - ${allocation.rack}. Available: ${availableQuantity}, Requested: ${allocation.allocatedQuantity}`, 400));
              }
            }
          } else {
            // Fallback to simple stock check if no allocation data
            const stocks = await Stock.find({ product: item.product });
            if (!stocks || stocks.length === 0) {
              return next(new AppError(`Product ${item.description} is not available in stock`, 400));
            }
            
            const totalAvailable = stocks.reduce((sum, stock) => sum + (stock.quantity - (stock.reservedQuantity || 0)), 0);
            if (totalAvailable < item.quantity) {
              return next(new AppError(`Insufficient stock for ${item.description}. Available: ${totalAvailable}, Requested: ${item.quantity}`, 400));
            }
          }
        }
      }
    }

    // Validate services when provided
    if (services && services.length > 0) {
      for (let i = 0; i < services.length; i++) {
        const item = services[i];
        if (!item.description) {
          return next(new AppError(`Service item ${i + 1} description is required`, 400));
        }
        if (item.quantity <= 0) {
          return next(new AppError(`Service item ${i + 1} quantity must be greater than 0`, 400));
        }
      }
    }

    // Create delivery challan
    const deliveryChallan = new DeliveryChallan({
      challanNumber,
      customer,
      location,
      spares: spares || [],
      services: services || [],
      dated: dated ? new Date(dated) : new Date(),
      modeOfPayment: cleanModeOfPayment,
      department,
      referenceNo: cleanReferenceNo,
      otherReferenceNo: cleanOtherReferenceNo,
      buyersOrderNo: cleanBuyersOrderNo,
      buyersOrderDate: buyersOrderDate ? new Date(buyersOrderDate) : undefined,
      dispatchDocNo: cleanDispatchDocNo,
      destination,
      dispatchedThrough,
      termsOfDelivery: cleanTermsOfDelivery,
      consignee: consignee && consignee.trim() !== '' ? consignee : undefined,
      notes: cleanNotes,
      createdBy: req.user!.id
    });

    await deliveryChallan.save();

    // Reduce inventory for spare items with product IDs
    if (spares && spares.length > 0) {
      for (const item of spares) {
        if (item.product && item.quantity > 0) {
          if (item.stockAllocation && item.stockAllocation.allocations) {
            // Use sequential allocation to update stock
            for (const allocation of item.stockAllocation.allocations) {
              // Find the ObjectIds for location, room, and rack
              const location = await StockLocation.findOne({ name: allocation.location });
              const room = await Room.findOne({ name: allocation.room, location: location?._id });
              const rack = await Rack.findOne({ name: allocation.rack, room: room?._id });
              
              if (location && room && rack) {
                // Find the specific stock record
                const stock = await Stock.findOne({ 
                  product: item.product,
                  location: location._id,
                  room: room._id,
                  rack: rack._id
                });
                
                if (stock) {
                  const originalQuantity = stock.quantity;
                  
                  // Reduce stock by allocated quantity
                  stock.quantity -= allocation.allocatedQuantity;
                  stock.availableQuantity = stock.quantity - (stock.reservedQuantity || 0);
                  stock.lastUpdated = new Date();
                  await stock.save();

                  // Create stock ledger entry
                  await StockLedger.create({
                    product: item.product,
                    location: stock.location,
                    room: stock.room,
                    rack: stock.rack,
                    transactionType: 'outward',
                    quantity: -allocation.allocatedQuantity,
                    reason: `Delivery Challan - ${challanNumber}`,
                    notes: `Delivery challan created for customer - ${allocation.location} - ${allocation.room} - ${allocation.rack}`,
                    performedBy: req.user!.id,
                    transactionDate: new Date(),
                    resultingQuantity: stock.quantity,
                    previousQuantity: originalQuantity,
                    referenceId: challanNumber,
                    referenceType: 'delivery_challan'
                  });
                }
              }
            }
          } else {
            // Fallback to simple stock update if no allocation data
            const stock = await Stock.findOne({ product: item.product });
            if (stock) {
              const originalQuantity = stock.quantity;
              
              // Reduce stock
              stock.quantity -= item.quantity;
              stock.availableQuantity = stock.quantity - stock.reservedQuantity;
              stock.lastUpdated = new Date();
              await stock.save();

              // Create stock ledger entry
              await StockLedger.create({
                product: item.product,
                location: stock.location,
                transactionType: 'outward',
                quantity: -item.quantity,
                reason: `Delivery Challan - ${challanNumber}`,
                notes: `Delivery challan created for customer`,
                performedBy: req.user!.id,
                transactionDate: new Date(),
                resultingQuantity: stock.quantity,
                previousQuantity: originalQuantity,
                referenceId: challanNumber,
                referenceType: 'delivery_challan'
              });
            }
          }
        }
      }
    }

    // Populate references for response
    await deliveryChallan.populate([
      'customer',
      'createdBy'
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan created successfully',
      data: { deliveryChallan }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery challan
// @route   PUT /api/v1/delivery-challans/:id
// @access  Private
export const updateDeliveryChallan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      customer,
      location,
      spares,
      services,
      dated,
      modeOfPayment,
      department,
      referenceNo,
      otherReferenceNo,
      buyersOrderNo,
      buyersOrderDate,
      dispatchDocNo,
      destination,
      dispatchedThrough,
      termsOfDelivery,
      consignee,
      notes,
      status
    } = req.body;

    // Clean up empty string fields
    const cleanModeOfPayment = modeOfPayment && modeOfPayment.trim() !== '' ? modeOfPayment : undefined;
    const cleanReferenceNo = referenceNo && referenceNo.trim() !== '' ? referenceNo : undefined;
    const cleanOtherReferenceNo = otherReferenceNo && otherReferenceNo.trim() !== '' ? otherReferenceNo : undefined;
    const cleanBuyersOrderNo = buyersOrderNo && buyersOrderNo.trim() !== '' ? buyersOrderNo : undefined;
    const cleanDispatchDocNo = dispatchDocNo && dispatchDocNo.trim() !== '' ? dispatchDocNo : undefined;
    const cleanTermsOfDelivery = termsOfDelivery && termsOfDelivery.trim() !== '' ? termsOfDelivery : undefined;
    const cleanNotes = notes && notes.trim() !== '' ? notes : undefined;

    const deliveryChallan = await DeliveryChallan.findById(req.params.id);
    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    // Store original spares for inventory adjustment
    const originalSpares = deliveryChallan.spares;
    const originalStatus = deliveryChallan.status;

    // Update fields
    if (customer) deliveryChallan.customer = customer;
    if (location) deliveryChallan.location = location;
    if (spares) deliveryChallan.spares = spares;
    if (services) deliveryChallan.services = services;
    if (dated) deliveryChallan.dated = new Date(dated);
    if (cleanModeOfPayment !== undefined) deliveryChallan.modeOfPayment = cleanModeOfPayment;
    if (department) deliveryChallan.department = department;
    if (cleanReferenceNo !== undefined) deliveryChallan.referenceNo = cleanReferenceNo;
    if (cleanOtherReferenceNo !== undefined) deliveryChallan.otherReferenceNo = cleanOtherReferenceNo;
    if (cleanBuyersOrderNo !== undefined) deliveryChallan.buyersOrderNo = cleanBuyersOrderNo;
    if (buyersOrderDate !== undefined) {
      deliveryChallan.buyersOrderDate = buyersOrderDate ? new Date(buyersOrderDate) : undefined;
    }
    if (cleanDispatchDocNo !== undefined) deliveryChallan.dispatchDocNo = cleanDispatchDocNo;
    if (destination) deliveryChallan.destination = destination;
    if (dispatchedThrough) deliveryChallan.dispatchedThrough = dispatchedThrough;
    if (cleanTermsOfDelivery !== undefined) deliveryChallan.termsOfDelivery = cleanTermsOfDelivery;
    if (consignee !== undefined) {
      deliveryChallan.consignee = consignee && consignee.trim() !== '' ? consignee : undefined;
    }
    if (cleanNotes !== undefined) deliveryChallan.notes = cleanNotes;
    if (status) deliveryChallan.status = status;

    // Validate new spares and check stock availability
    // We need to check stock for any increases in quantity, regardless of status
    if (spares && spares.length > 0) {
             // Create maps for easier comparison
       const originalSparesMap = new Map();
       originalSpares.forEach((item: IDeliveryChallanItem) => {
         if (item.product) {
           originalSparesMap.set(item.product.toString(), item.quantity || 0);
         }
       });

      for (let i = 0; i < spares.length; i++) {
        const item = spares[i];
        if (item.product && item.quantity > 0) {
          const originalQty = originalSparesMap.get(item.product.toString()) || 0;
          const qtyIncrease = item.quantity - originalQty;
          
          // Only validate stock if quantity is increasing
          if (qtyIncrease > 0) {
            const stock = await Stock.findOne({ product: item.product });
            if (!stock) {
              return next(new AppError(`Product ${item.description} is not available in stock`, 400));
            }
            if (stock.availableQuantity < qtyIncrease) {
              return next(new AppError(`Insufficient stock for ${item.description}. Need ${qtyIncrease} more units, but only ${stock.availableQuantity} available`, 400));
            }
          }
        }
      }
    }

    await deliveryChallan.save();

    // Smart inventory adjustment logic - inventory is always affected since it's reduced during creation
    // We need to adjust inventory for any quantity changes regardless of status
    if (spares) {
      // Create maps for easier comparison
      const originalSparesMap = new Map();
      const newSparesMap = new Map();

             // Build original spares map
       originalSpares.forEach((item: IDeliveryChallanItem) => {
         if (item.product) {
           originalSparesMap.set(item.product.toString(), item.quantity || 0);
         }
       });

       // Build new spares map
       spares.forEach((item: IDeliveryChallanItem) => {
         if (item.product) {
           newSparesMap.set(item.product.toString(), item.quantity || 0);
         }
       });

      // Get all unique products from both maps
      const allProducts = new Set([...originalSparesMap.keys(), ...newSparesMap.keys()]);

      // Process inventory adjustments for each product
      for (const productId of allProducts) {
        const originalQty = originalSparesMap.get(productId) || 0;
        const newQty = newSparesMap.get(productId) || 0;
        const qtyDifference = newQty - originalQty;

        // Only adjust if there's a difference
        if (qtyDifference !== 0) {
          const stock = await Stock.findOne({ product: productId });
          if (stock) {
            const previousQuantity = stock.quantity;

            // Apply the quantity difference
            // If qtyDifference is positive, we need more items (reduce stock)
            // If qtyDifference is negative, we need fewer items (increase stock)
            stock.quantity -= qtyDifference;
            stock.availableQuantity = stock.quantity - stock.reservedQuantity;
            stock.lastUpdated = new Date();
            await stock.save();

            // Create stock ledger entry
            const transactionType = qtyDifference > 0 ? 'outward' : 'inward';
            const ledgerQuantity = qtyDifference > 0 ? -qtyDifference : Math.abs(qtyDifference);
            
            // Get product details for better logging
            const productInfo = spares.find((s: IDeliveryChallanItem) => s.product && s.product.toString() === productId) || 
                               originalSpares.find((s: IDeliveryChallanItem) => s.product && s.product.toString() === productId);
            
            await StockLedger.create({
              product: productId,
              location: stock.location,
              transactionType,
              quantity: ledgerQuantity,
              reason: `Delivery Challan Update - ${deliveryChallan.challanNumber}`,
              notes: qtyDifference > 0 
                ? `Quantity increased from ${originalQty} to ${newQty} (${productInfo?.description || 'Unknown'})`
                : `Quantity decreased from ${originalQty} to ${newQty} (${productInfo?.description || 'Unknown'})`,
              performedBy: req.user!.id,
              transactionDate: new Date(),
              resultingQuantity: stock.quantity,
              previousQuantity: previousQuantity,
              referenceId: deliveryChallan.challanNumber,
              referenceType: 'delivery_challan'
            });

            console.log(`📦 Inventory adjusted for product ${productId}: ${originalQty} → ${newQty} (difference: ${qtyDifference})`);
          }
        }
      }
    }

    // Populate references for response
    await deliveryChallan.populate([
      'customer',
      'createdBy'
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan updated successfully',
      data: { deliveryChallan }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete delivery challan
// @route   DELETE /api/v1/delivery-challans/:id
// @access  Private
export const deleteDeliveryChallan = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deliveryChallan = await DeliveryChallan.findById(req.params.id);
    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    // Only allow deletion of draft challans
    if (deliveryChallan.status !== 'draft') {
      return next(new AppError('Only draft delivery challans can be deleted', 400));
    }

    // If status was 'sent' or 'delivered', restore inventory
    if (['sent', 'delivered'].includes(deliveryChallan.status)) {
      for (const item of deliveryChallan.spares) {
        if (item.product && item.quantity > 0) {
          const stock = await Stock.findOne({ product: item.product });
          if (stock) {
            stock.quantity += item.quantity;
            stock.availableQuantity = stock.quantity - stock.reservedQuantity;
            stock.lastUpdated = new Date();
            await stock.save();

            // Create stock ledger entry for restoration
            await StockLedger.create({
              product: item.product,
              location: stock.location,
              transactionType: 'inward',
              quantity: item.quantity,
              reason: `Delivery Challan Deletion - ${deliveryChallan.challanNumber}`,
              notes: `Restored from deleted delivery challan`,
              performedBy: req.user!.id,
              transactionDate: new Date(),
              resultingQuantity: stock.quantity,
              previousQuantity: stock.quantity - item.quantity,
              referenceId: deliveryChallan.challanNumber,
              referenceType: 'delivery_challan'
            });
          }
        }
      }
    }

    await DeliveryChallan.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update delivery challan status
// @route   PATCH /api/v1/delivery-challans/:id/status
// @access  Private
export const updateDeliveryChallanStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const deliveryChallan = await DeliveryChallan.findById(req.params.id);
    
    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    const previousStatus = deliveryChallan.status;
    deliveryChallan.status = status;

    // Handle inventory changes based on status transitions
    if (['sent', 'delivered'].includes(status)) {
      // Reduce inventory when status changes to sent/delivered
      for (const item of deliveryChallan.spares) {
        if (item.product && item.quantity > 0) {
          // Check if we already reduced inventory (e.g., from draft to sent)
          if (['draft', 'cancelled'].includes(previousStatus)) {
            if (item.stockAllocation && item.stockAllocation.allocations) {
              // Use sequential allocation to update stock
              for (const allocation of item.stockAllocation.allocations) {
                // Find the ObjectIds for location, room, and rack
                const location = await StockLocation.findOne({ name: allocation.location });
                const room = await Room.findOne({ name: allocation.room, location: location?._id });
                const rack = await Rack.findOne({ name: allocation.rack, room: room?._id });
                
                if (location && room && rack) {
                  // Find the specific stock record
                  const stock = await Stock.findOne({ 
                    product: item.product,
                    location: location._id,
                    room: room._id,
                    rack: rack._id
                  });
                  
                  if (stock) {
                    const originalQuantity = stock.quantity;
                    
                    // Reduce stock by allocated quantity
                    stock.quantity -= allocation.allocatedQuantity;
                    stock.availableQuantity = stock.quantity - (stock.reservedQuantity || 0);
                    stock.lastUpdated = new Date();
                    await stock.save();

                    // Create stock ledger entry
                    await StockLedger.create({
                      product: item.product,
                      location: stock.location,
                      room: stock.room,
                      rack: stock.rack,
                      transactionType: 'outward',
                      quantity: -allocation.allocatedQuantity,
                      reason: `Delivery Challan Status Change - ${deliveryChallan.challanNumber}`,
                      notes: `Status changed to ${status} - ${allocation.location} - ${allocation.room} - ${allocation.rack}`,
                      performedBy: req.user!.id,
                      transactionDate: new Date(),
                      resultingQuantity: stock.quantity,
                      previousQuantity: originalQuantity,
                      referenceId: deliveryChallan.challanNumber,
                      referenceType: 'delivery_challan'
                    });
                  }
                }
              }
            } else {
              // Fallback to simple stock update if no allocation data
              const stock = await Stock.findOne({ product: item.product });
              if (stock) {
                const originalQuantity = stock.quantity;
                stock.quantity -= item.quantity;
                stock.availableQuantity = stock.quantity - stock.reservedQuantity;
                stock.lastUpdated = new Date();
                await stock.save();

                // Create stock ledger entry
                await StockLedger.create({
                  product: item.product,
                  location: stock.location,
                  transactionType: 'outward',
                  quantity: -item.quantity,
                  reason: `Delivery Challan Status Change - ${deliveryChallan.challanNumber}`,
                  notes: `Status changed to ${status}`,
                  performedBy: req.user!.id,
                  transactionDate: new Date(),
                  resultingQuantity: stock.quantity,
                  previousQuantity: originalQuantity,
                  referenceId: deliveryChallan.challanNumber,
                  referenceType: 'delivery_challan'
                });
              }
            }
          }
        }
      }
    } else if (status === 'draft' && ['sent', 'delivered'].includes(previousStatus)) {
      // Restore inventory when status changes back to draft
      for (const item of deliveryChallan.spares) {
        if (item.product && item.quantity > 0) {
          const stock = await Stock.findOne({ product: item.product });
          if (stock) {
            stock.quantity += item.quantity;
            stock.availableQuantity = stock.quantity - stock.reservedQuantity;
            stock.lastUpdated = new Date();
            await stock.save();

            // Create stock ledger entry for restoration
            await StockLedger.create({
              product: item.product,
              location: stock.location,
              transactionType: 'inward',
              quantity: item.quantity,
              reason: `Delivery Challan Status Change - ${deliveryChallan.challanNumber}`,
              notes: `Status changed back to draft`,
              performedBy: req.user!.id,
              transactionDate: new Date(),
              resultingQuantity: stock.quantity,
              previousQuantity: stock.quantity - item.quantity,
              referenceId: deliveryChallan.challanNumber,
              referenceType: 'delivery_challan'
            });
          }
        }
      }
    }

    await deliveryChallan.save();

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan status updated successfully',
      data: { deliveryChallan }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};



// @desc    Generate PDF for delivery challan
// @route   GET /api/v1/delivery-challans/:id/pdf
// @access  Private
export const generateDeliveryChallanPDFEndpoint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deliveryChallan = await DeliveryChallan.findById(req.params.id)
      .populate('customer', 'name email phone address customerType addresses')
      .populate('createdBy', 'firstName lastName email');

    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    const pdfBuffer = await generateDeliveryChallanPDF(deliveryChallan as any);

    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="delivery-challan-${deliveryChallan.challanNumber}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};

// @desc    Export delivery challans to Excel
// @route   GET /api/v1/delivery-challans/export
// @access  Private
export const exportDeliveryChallans = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      status,
      customer,
      dateFrom,
      dateTo,
      department
    } = req.query as QueryParams & {
      status?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      department?: string;
    };

    // Build filter object (same as getDeliveryChallans)
    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (customer && customer !== 'all') {
      filter.customer = customer;
    }

    if (department && department !== 'all') {
      filter.department = department;
    }

    if (dateFrom || dateTo) {
      filter.dated = {};
      if (dateFrom && dateFrom !== 'undefined' && dateFrom !== 'null') {
        filter.dated.$gte = new Date(dateFrom);
      }
      if (dateTo && dateTo !== 'undefined' && dateTo !== 'null') {
        filter.dated.$lte = new Date(dateTo);
      }
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { challanNumber: { $regex: search, $options: 'i' } },
        { referenceNo: { $regex: search, $options: 'i' } },
        { buyersOrderNo: { $regex: search, $options: 'i' } },
        { dispatchDocNo: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Get all delivery challans matching the filter
    const deliveryChallans = await DeliveryChallan.find(filter)
      .populate('customer', 'name email phone address')
      .populate('createdBy', 'firstName lastName email')
      .sort({ dated: -1 });

    // Prepare data for Excel export with proper formatting
    const exportData = deliveryChallans.map((challan, index) => ({
      'S.No': index + 1,
      'Challan Number': challan.challanNumber || '',
      'Invoice Number': '', // Placeholder for invoice number - to be populated when relationship is established
      'Date': challan.dated ? new Date(challan.dated).toLocaleDateString('en-GB') : '',
      'Customer Name': (challan.customer as any)?.name || '',
      'Customer Email': (challan.customer as any)?.email || '',
      'Customer Phone': (challan.customer as any)?.phone || '',
      'Department': challan.department || '',
      'Status': challan.status?.charAt(0).toUpperCase() + challan.status?.slice(1) || 'Draft',
      'Reference No': challan.referenceNo || '',
      'Other Reference No': challan.otherReferenceNo || '',
      'Buyers Order No': challan.buyersOrderNo || '',
      'Buyers Order Date': challan.buyersOrderDate ? new Date(challan.buyersOrderDate).toLocaleDateString('en-GB') : '',
      'Dispatch Doc No': challan.dispatchDocNo || '',
      'Destination': challan.destination || '',
      'Dispatched Through': challan.dispatchedThrough || '',
      'Terms of Delivery': challan.termsOfDelivery || '',
      'Consignee': challan.consignee || '',
      'Mode of Payment': challan.modeOfPayment || '',
      'Total Spares': challan.spares?.length || 0,
      'Total Services': challan.services?.length || 0,
      'Notes': challan.notes || '',
      'Created By': (challan.createdBy as any) ? `${(challan.createdBy as any).firstName} ${(challan.createdBy as any).lastName}` : '',
      'Created At': challan.createdAt ? new Date(challan.createdAt).toLocaleDateString('en-GB') : '',
    }));

    const response: APIResponse = {
      success: true,
      message: 'Delivery challans data prepared for export',
      data: exportData
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get delivery challan statistics
// @route   GET /api/v1/delivery-challans/stats
// @access  Private
export const getDeliveryChallanStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalChallans,
      draftChallans,
      sentChallans,
      deliveredChallans,
      cancelledChallans
    ] = await Promise.all([
      DeliveryChallan.countDocuments(),
      DeliveryChallan.countDocuments({ status: 'draft' }),
      DeliveryChallan.countDocuments({ status: 'sent' }),
      DeliveryChallan.countDocuments({ status: 'delivered' }),
      DeliveryChallan.countDocuments({ status: 'cancelled' })
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Delivery challan statistics retrieved successfully',
      data: {
        totalChallans,
        draftChallans,
        sentChallans,
        deliveredChallans,
        cancelledChallans
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 