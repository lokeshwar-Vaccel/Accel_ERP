import { Request, Response, NextFunction } from 'express';
import { DeliveryChallan, IDeliveryChallan } from '../models/DeliveryChallan';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';

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
      .populate('supplier', 'name email phone addresses')
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
      .populate('customer', 'name email phone address customerType')
      .populate('supplier', 'name email phone addresses')
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
      supplier,
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

    // Generate challan number if not provided
    let challanNumber = req.body.challanNumber;
    if (!challanNumber) {
      challanNumber = await generateReferenceId('CHALLAN');
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

    if (!dispatchedThrough) {
      return next(new AppError('Dispatched through is required', 400));
    }

    // Validate spares and services
    if ((!spares || spares.length === 0) && (!services || services.length === 0)) {
      return next(new AppError('At least one spare item or service is required', 400));
    }

    // Validate spares
    if (spares && spares.length > 0) {
      for (let i = 0; i < spares.length; i++) {
        const item = spares[i];
        if (!item.description) {
          return next(new AppError(`Spare item ${i + 1} description is required`, 400));
        }
        if (item.quantity <= 0) {
          return next(new AppError(`Spare item ${i + 1} quantity must be greater than 0`, 400));
        }
      }
    }

    // Validate services
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
      supplier,
      spares: spares || [],
      services: services || [],
      dated: dated ? new Date(dated) : new Date(),
      modeOfPayment,
      department,
      referenceNo,
      otherReferenceNo,
      buyersOrderNo,
      buyersOrderDate: buyersOrderDate ? new Date(buyersOrderDate) : undefined,
      dispatchDocNo,
      destination,
      dispatchedThrough,
      termsOfDelivery,
      consignee,
      notes,
      createdBy: req.user!.id
    });

    await deliveryChallan.save();

    // Populate references for response
    await deliveryChallan.populate([
      'customer',
      'supplier',
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
      supplier,
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

    const deliveryChallan = await DeliveryChallan.findById(req.params.id);
    if (!deliveryChallan) {
      return next(new AppError('Delivery challan not found', 404));
    }

    // Update fields
    if (customer) deliveryChallan.customer = customer;
    if (supplier !== undefined) deliveryChallan.supplier = supplier;
    if (spares) deliveryChallan.spares = spares;
    if (services) deliveryChallan.services = services;
    if (dated) deliveryChallan.dated = new Date(dated);
    if (modeOfPayment !== undefined) deliveryChallan.modeOfPayment = modeOfPayment;
    if (department) deliveryChallan.department = department;
    if (referenceNo !== undefined) deliveryChallan.referenceNo = referenceNo;
    if (otherReferenceNo !== undefined) deliveryChallan.otherReferenceNo = otherReferenceNo;
    if (buyersOrderNo !== undefined) deliveryChallan.buyersOrderNo = buyersOrderNo;
    if (buyersOrderDate !== undefined) {
      deliveryChallan.buyersOrderDate = buyersOrderDate ? new Date(buyersOrderDate) : undefined;
    }
    if (dispatchDocNo !== undefined) deliveryChallan.dispatchDocNo = dispatchDocNo;
    if (destination) deliveryChallan.destination = destination;
    if (dispatchedThrough) deliveryChallan.dispatchedThrough = dispatchedThrough;
    if (termsOfDelivery !== undefined) deliveryChallan.termsOfDelivery = termsOfDelivery;
    if (consignee !== undefined) deliveryChallan.consignee = consignee;
    if (notes !== undefined) deliveryChallan.notes = notes;
    if (status) deliveryChallan.status = status;

    await deliveryChallan.save();

    // Populate references for response
    await deliveryChallan.populate([
      'customer',
      'supplier',
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