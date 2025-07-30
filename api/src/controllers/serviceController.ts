import { Response, NextFunction } from 'express';
import { ServiceTicket } from '../models/ServiceTicket';
import { Stock } from '../models/Stock';
import { AuthenticatedRequest, APIResponse, TicketStatus, TicketPriority, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all service tickets
// @route   GET /api/v1/services
// @access  Private
export const getServiceTickets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('Service tickets query params:', req.query);
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      search,
      status,
      priority,
      assignedTo,
      customer,
      dateFrom,
      dateTo,
      slaStatus
    } = req.query as QueryParams & {
      status?: TicketStatus;
      priority?: TicketPriority;
      assignedTo?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      slaStatus?: 'on_track' | 'breached' | 'met' | 'no_sla';
    };

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

        // Handle SLA status filtering
    if (slaStatus) {
      const now = new Date();
      
      switch (slaStatus) {
        case 'on_track':
          query.$and = [
            { slaDeadline: { $gte: now } },
            { status: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } }
          ];
          break;
        case 'breached':
          query.$or = [
            {
              slaDeadline: { $lt: now },
              status: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
            }
          ];
          break;
        case 'met':
          query.$and = [
            { status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } }
          ];
          break;
        case 'no_sla':
          query.slaDeadline = { $exists: false };
          break;
      }
    }

    let tickets: any[] = [];
    let total = 0;

    // Handle complex SLA filtering with aggregation
    if (slaStatus && (slaStatus === 'breached' || slaStatus === 'met')) {
      const now = new Date();
      
      const pipeline: any[] = [
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignedTo'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'createdBy'
          }
        },
        {
          $addFields: {
            customer: { $arrayElemAt: ['$customer', 0] },
            product: { $arrayElemAt: ['$product', 0] },
            assignedTo: { $arrayElemAt: ['$assignedTo', 0] },
            createdBy: { $arrayElemAt: ['$createdBy', 0] }
          }
        }
      ];

      // Add SLA filtering logic
      if (slaStatus === 'breached') {
        pipeline.push({
          $match: {
            $or: [
              {
                slaDeadline: { $lt: now },
                status: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
              },
              {
                $expr: {
                  $and: [
                    { $lt: ['$slaDeadline', '$completedDate'] },
                    { $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }
                  ]
                }
              }
            ]
          }
        });
      } else if (slaStatus === 'met') {
        pipeline.push({
          $match: {
            $expr: {
              $and: [
                { $gte: ['$slaDeadline', '$completedDate'] },
                { $in: ['$status', [TicketStatus.RESOLVED, TicketStatus.CLOSED]] }
              ]
            }
          }
        });
      }

      // Add other filters
      if (search) {
        pipeline.push({
          $match: {
            $or: [
              { ticketNumber: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { serialNumber: { $regex: search, $options: 'i' } }
            ]
          }
        });
      }

      if (status) {
        pipeline.push({ $match: { status } });
      }

      if (priority) {
        pipeline.push({ $match: { priority } });
      }

      if (assignedTo) {
        pipeline.push({ $match: { assignedTo: assignedTo } });
      }

      if (customer) {
        pipeline.push({ $match: { customer: customer } });
      }

      if (dateFrom || dateTo) {
        const dateFilter: any = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
        pipeline.push({ $match: { createdAt: dateFilter } });
      }

      // Add sorting and pagination
      pipeline.push({ $sort: { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } });
      
      // Get total count
      const countPipeline = [...pipeline, { $count: 'total' }];
      const countResult = await ServiceTicket.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;

      // Add pagination
      pipeline.push(
        { $skip: (Number(page) - 1) * Number(limit) },
        { $limit: Number(limit) }
      );

      console.log('Using aggregation pipeline:', JSON.stringify(pipeline, null, 2));
      tickets = await ServiceTicket.aggregate(pipeline);
    } else {
      // Use regular find for simple queries
      console.log('Using simple find query:', JSON.stringify(query, null, 2));
      tickets = await ServiceTicket.find(query)
        .populate('customer', 'name email phone customerType addresses')
        .populate('product', 'name category brand modelNumber')
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('partsUsed.product', 'name category price')
        .sort(sort as string)
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      total = await ServiceTicket.countDocuments(query);
    }

    // Process tickets to include primary address
    const processedTickets = tickets.map((ticket: any) => {
      if (ticket.customer && ticket.customer.addresses && Array.isArray(ticket.customer.addresses)) {
        const primaryAddress = ticket.customer.addresses.find((addr: any) => addr.isPrimary === true);
        if (primaryAddress) {
          ticket.customer.primaryAddress = primaryAddress;
        }
      }
      return ticket;
    });

    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
      success: true,
      message: 'Service tickets retrieved successfully',
      data: { tickets: processedTickets },
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

// @desc    Get single service ticket
// @route   GET /api/v1/services/:id
// @access  Private
export const getServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ticket = await ServiceTicket.findById(req.params.id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand modelNumber specifications')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email')
      .populate('partsUsed.product', 'name category price');

    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    // Process ticket to include primary address
    if (ticket.customer && (ticket.customer as any).addresses && Array.isArray((ticket.customer as any).addresses)) {
      const primaryAddress = (ticket.customer as any).addresses.find((addr: any) => addr.isPrimary === true);
      if (primaryAddress) {
        (ticket.customer as any).primaryAddress = primaryAddress;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Service ticket retrieved successfully',
      data: { ticket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new service ticket
// @route   POST /api/v1/services
// @access  Private
export const createServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate ticket number
    const ticketCount = await ServiceTicket.countDocuments();
    const ticketNumber = `SPS-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

    // Calculate SLA deadline based on priority
    const slaHours = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168
    };
    
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours[req.body.priority as TicketPriority]);

    const ticketData = {
      ...req.body,
      ticketNumber,
      slaDeadline,
      createdBy: req.user!.id
    };

    const ticket = await ServiceTicket.create(ticketData);

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    // Process ticket to include primary address
    if (populatedTicket && populatedTicket.customer && (populatedTicket.customer as any).addresses && Array.isArray((populatedTicket.customer as any).addresses)) {
      const primaryAddress = (populatedTicket.customer as any).addresses.find((addr: any) => addr.isPrimary === true);
      if (primaryAddress) {
        (populatedTicket.customer as any).primaryAddress = primaryAddress;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Service ticket created successfully',
      data: { ticket: populatedTicket }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service ticket
// @route   PUT /api/v1/services/:id
// @access  Private
export const updateServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ticket = await ServiceTicket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }
    console.log("req.body==>",req.body);

    // Check if priority is being updated and update SLA deadline accordingly
    if (req.body.priority && req.body.priority !== ticket.priority) {
      const hoursToAdd = req.body.priority === TicketPriority.CRITICAL ? 4 :
                        req.body.priority === TicketPriority.HIGH ? 24 :
                        req.body.priority === TicketPriority.MEDIUM ? 72 : 120;
      
      // Only update SLA deadline if the ticket is not already resolved or closed
      if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
        req.body.slaDeadline = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
      }
    }

    const updatedTicket = await ServiceTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand')
      .populate('assignedTo', 'firstName lastName email');

    // Process ticket to include primary address
    if (updatedTicket && updatedTicket.customer && (updatedTicket.customer as any).addresses && Array.isArray((updatedTicket.customer as any).addresses)) {
      const primaryAddress = (updatedTicket.customer as any).addresses.find((addr: any) => addr.isPrimary === true);
      if (primaryAddress) {
        (updatedTicket.customer as any).primaryAddress = primaryAddress;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Service ticket updated successfully',
      data: { ticket: updatedTicket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Assign service ticket
// @route   PUT /api/v1/services/:id/assign
// @access  Private
export const assignServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignedTo, scheduledDate, notes } = req.body;

    const ticket = await ServiceTicket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    ticket.assignedTo = assignedTo;
    ticket.scheduledDate = scheduledDate ? new Date(scheduledDate) : undefined;
    if (notes) ticket.serviceReport = notes;
    
    // Update status to in_progress if it was open
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
    }

    await ticket.save();

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('assignedTo', 'firstName lastName email phone');

    const response: APIResponse = {
      success: true,
      message: 'Service ticket assigned successfully',
      data: { ticket: populatedTicket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete service ticket
// @route   PUT /api/v1/services/:id/complete
// @access  Private
export const completeServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { serviceReport, partsUsed, customerSignature } = req.body;

    const ticket = await ServiceTicket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    // Update stock for parts used
    if (partsUsed && partsUsed.length > 0) {
      for (const part of partsUsed) {
        // Find stock record and reduce quantity
        const stock = await Stock.findOne({ 
          product: part.product, 
          // You might want to specify location based on technician location
        });
        
        if (stock && stock.availableQuantity >= part.quantity) {
          stock.quantity -= part.quantity;
          stock.availableQuantity = stock.quantity - stock.reservedQuantity;
          stock.lastUpdated = new Date();
          await stock.save();
        }
      }
      ticket.partsUsed = partsUsed;
    }

    ticket.serviceReport = serviceReport;
    ticket.customerSignature = customerSignature;
    ticket.status = TicketStatus.RESOLVED;
    ticket.completedDate = new Date();

    await ticket.save();

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Service ticket completed successfully',
      data: { ticket: populatedTicket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Add parts to service ticket
// @route   POST /api/v1/services/:id/parts
// @access  Private
export const addPartsUsed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { parts } = req.body; // Array of { product, quantity, serialNumbers }

    const ticket = await ServiceTicket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    // Add parts to the ticket
    ticket.partsUsed.push(...parts);
    await ticket.save();

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('partsUsed.product', 'name category price');

    const response: APIResponse = {
      success: true,
      message: 'Parts added to service ticket successfully',
      data: { 
        ticket: populatedTicket,
        partsAdded: parts
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service ticket status
// @route   PUT /api/v1/services/:id/status
// @access  Private
export const updateServiceTicketStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const ticket = await ServiceTicket.findById(id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    // Update the status
    ticket.status = status;
    
    // If status is resolved or closed, set completed date
    if (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED) {
      ticket.completedDate = new Date();
    }

    await ticket.save();

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    // Process ticket to include primary address
    if (populatedTicket && populatedTicket.customer && (populatedTicket.customer as any).addresses && Array.isArray((populatedTicket.customer as any).addresses)) {
      const primaryAddress = (populatedTicket.customer as any).addresses.find((addr: any) => addr.isPrimary === true);
      if (primaryAddress) {
        (populatedTicket.customer as any).primaryAddress = primaryAddress;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Service ticket status updated successfully',
      data: { ticket: populatedTicket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get service statistics
// @route   GET /api/v1/services/stats
// @access  Private
export const getServiceStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalTickets = await ServiceTicket.countDocuments();
    const openTickets = await ServiceTicket.countDocuments({ status: TicketStatus.OPEN });
    const inProgressTickets = await ServiceTicket.countDocuments({ status: TicketStatus.IN_PROGRESS });
    const resolvedTickets = await ServiceTicket.countDocuments({ status: TicketStatus.RESOLVED });
    const overdueTickets = await ServiceTicket.countDocuments({ 
      slaDeadline: { $lt: new Date() },
      status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
    });

    const ticketsByPriority = await ServiceTicket.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const avgResolutionTime = await ServiceTicket.aggregate([
      {
        $match: {
          status: TicketStatus.RESOLVED,
          completedDate: { $exists: true }
        }
      },
      {
        $addFields: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$completedDate', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionHours: { $avg: '$resolutionTime' }
        }
      }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Service statistics retrieved successfully',
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        overdueTickets,
        ticketsByPriority,
        avgResolutionHours: avgResolutionTime[0]?.avgResolutionHours || 0
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 