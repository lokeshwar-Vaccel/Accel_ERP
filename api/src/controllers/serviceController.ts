import { Response, NextFunction } from 'express';
import { ServiceTicket } from '../models/ServiceTicket';
import { Stock } from '../models/Stock';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, TicketStatus, TicketPriority, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { sendFeedbackEmail as sendFeedbackEmailUtil } from '../utils/nodemailer';
import crypto from 'crypto';

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
    // Calculate SLA deadline based on priority
    const slaHours = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168
    };
    
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours[req.body.priority as TicketPriority]);

    // Prepare ticket data with standardized fields
    const ticketData = {
      ...req.body,
      slaDeadline,
      createdBy: req.user!.id,
      // Map legacy fields to standardized fields if not provided
      customerName: req.body.customerName || (req.body.customer ? 'Customer Name' : ''),
      complaintDescription: req.body.complaintDescription || req.body.description || '',
      serviceRequestEngineer: req.body.serviceRequestEngineer || req.body.assignedTo,
      serviceRequestStatus: req.body.serviceRequestStatus || req.body.status || TicketStatus.OPEN,
      serviceRequestType: req.body.serviceRequestType || req.body.serviceType || 'repair',
      requestSubmissionDate: req.body.requestSubmissionDate ? (typeof req.body.requestSubmissionDate === 'string' ? new Date(req.body.requestSubmissionDate.split('T')[0] + 'T00:00:00.000Z') : new Date(req.body.requestSubmissionDate)) : new Date(),
      serviceRequiredDate: req.body.serviceRequiredDate || req.body.scheduledDate || new Date(),
      engineSerialNumber: req.body.engineSerialNumber || req.body.serialNumber || '',
      magiecSystemCode: req.body.magiecSystemCode || '',
      magiecCode: req.body.magiecCode || '',
      businessVertical: req.body.businessVertical || '',
      invoiceRaised: req.body.invoiceRaised || false,
      siteIdentifier: req.body.siteIdentifier || '',
      stateName: req.body.stateName || '',
      siteLocation: req.body.siteLocation || '',
      // Pass the serviceRequestNumber from Excel to the model
      serviceRequestNumber: req.body.serviceRequestNumber,
      // Use serviceRequestNumber as ticketNumber if provided
      ticketNumber: req.body.serviceRequestNumber || undefined
    };

    console.log('Creating ticket with data:', ticketData);

    const ticket = await ServiceTicket.create(ticketData);
    console.log('Created ticket:', ticket);

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand')
      .populate('createdBy', 'firstName lastName email')
      .populate('serviceRequestEngineer', 'firstName lastName email');

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

    // Sync standardized fields with legacy fields
    if (req.body.status) {
      req.body.serviceRequestStatus = req.body.status;
    }
    if (req.body.serviceRequestStatus) {
      req.body.status = req.body.serviceRequestStatus;
    }
    if (req.body.assignedTo) {
      req.body.serviceRequestEngineer = req.body.assignedTo;
    }
    if (req.body.serviceRequestEngineer) {
      req.body.assignedTo = req.body.serviceRequestEngineer;
    }
    if (req.body.description) {
      req.body.complaintDescription = req.body.description;
    }
    if (req.body.complaintDescription) {
      req.body.description = req.body.complaintDescription;
    }

    const updatedTicket = await ServiceTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone customerType addresses')
      .populate('product', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('serviceRequestEngineer', 'firstName lastName email');

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

    // Send feedback email if ticket is resolved
    if (status === TicketStatus.RESOLVED) {
      try {
        // Send feedback email asynchronously (don't wait for it)
        // Get ticket details for email
        const populatedTicket = await ServiceTicket.findById(ticket._id)
          .populate('customer', 'name email phone')
          .populate('product', 'name category')
          .populate('assignedTo', 'firstName lastName');

        if (populatedTicket && populatedTicket.customer) {
          const customer = populatedTicket.customer as any;
          
          if (customer.email) {
            // Create feedback URL
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const token = crypto.randomBytes(32).toString('hex');
            const feedbackUrl = `${baseUrl}/feedback/${token}`;
            
            // Create feedback record in database
            const { CustomerFeedback } = await import('../models/CustomerFeedback');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days
            
            const feedback = new CustomerFeedback({
              ticketId: ticket._id,
              customerEmail: customer.email,
              customerName: customer.name || 'Customer',
              rating: 0,
              serviceQuality: 'good',
              technicianRating: 0,
              timelinessRating: 0,
              qualityRating: 0,
              wouldRecommend: false,
              token,
              expiresAt
            });

            await feedback.save();
            
            // Send email using nodemailer utility
            sendFeedbackEmailUtil(
              customer.email,
              customer.name || 'Customer',
              populatedTicket.ticketNumber || '',
              feedbackUrl,
              populatedTicket
            ).catch(error => {
              console.error('Failed to send feedback email:', error);
            });
          } else {
            console.error('Customer email not found for ticket:', ticket._id);
          }
        } else {
          console.error('Customer not found for ticket:', ticket._id);
        }
      } catch (error) {
        console.error('Error sending feedback email:', error);
      }
    }

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

// @desc    Bulk import service tickets from Excel
// @route   POST /api/v1/services/bulk-import
// @access  Private
export const bulkImportServiceTickets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { tickets } = req.body;



    if (!Array.isArray(tickets) || tickets.length === 0) {
      return next(new AppError('No tickets provided for import', 400));
    }

    const importedTickets = [];
    const errors = [];

    for (let i = 0; i < tickets.length; i++) {
      const ticketData = tickets[i];
      
      try {
        // Use the serviceRequestEngineer ID directly (frontend already found the correct user)
        let serviceRequestEngineer = ticketData.serviceRequestEngineer;
        
        // Validate that the serviceRequestEngineer ID exists in our database
        if (serviceRequestEngineer) {
          const engineer = await User.findById(serviceRequestEngineer);
          if (!engineer) {
            throw new Error(`Service Request Engineer with ID ${serviceRequestEngineer} not found`);
          }
        }

        // Find customer by name
        let customer = null;
        if (ticketData.customerName) {
          customer = await Customer.findOne({
            name: { $regex: ticketData.customerName, $options: 'i' }
          });
        }

        // Find product by name
        let product = null;
        if (ticketData.productName) {
          product = await Product.findOne({
            name: { $regex: ticketData.productName, $options: 'i' }
          });
        }

        // Map Excel status to application status
        let mappedStatus = TicketStatus.OPEN;
        if (ticketData.status) {
          const statusMapping: { [key: string]: TicketStatus } = {
            'new': TicketStatus.OPEN,
            'New': TicketStatus.OPEN,
            'NEW': TicketStatus.OPEN,
            'resolved': TicketStatus.RESOLVED,
            'Resolved': TicketStatus.RESOLVED,
            'RESOLVED': TicketStatus.RESOLVED,
            'in progress': TicketStatus.IN_PROGRESS,
            'In Progress': TicketStatus.IN_PROGRESS,
            'IN PROGRESS': TicketStatus.IN_PROGRESS,
            'closed': TicketStatus.CLOSED,
            'Closed': TicketStatus.CLOSED,
            'CLOSED': TicketStatus.CLOSED,
            'cancelled': TicketStatus.CANCELLED,
            'Cancelled': TicketStatus.CANCELLED,
            'CANCELLED': TicketStatus.CANCELLED
          };
          mappedStatus = statusMapping[ticketData.status] || TicketStatus.OPEN;
        }

        const ticketDataToCreate = {
          ...ticketData,
          // Explicitly pass serviceRequestNumber from Excel to preserve it
          serviceRequestNumber: ticketData.serviceRequestNumber || '',
          serviceRequestEngineer: serviceRequestEngineer || req.user!.id,
          assignedTo: serviceRequestEngineer || req.user!.id, // Set assignedTo to the same as serviceRequestEngineer
          customer: customer?._id,
          product: product?._id,
          createdBy: req.user!.id,
          requestSubmissionDate: ticketData.requestSubmissionDate ? new Date(ticketData.requestSubmissionDate.split('T')[0] + 'T00:00:00.000Z') : new Date(),
          serviceRequiredDate: ticketData.serviceRequiredDate ? new Date(ticketData.serviceRequiredDate) : new Date(),
          serviceRequestStatus: mappedStatus,
          serviceRequestType: ticketData.serviceRequestType || 'repair',
          priority: ticketData.priority || TicketPriority.MEDIUM,
          status: mappedStatus,
          description: ticketData.complaintDescription || ticketData.description || '',
          complaintDescription: ticketData.complaintDescription || ticketData.description || '',
          customerName: ticketData.customerName || '',
          engineSerialNumber: ticketData.engineSerialNumber || ticketData.serialNumber || '',
          magiecSystemCode: ticketData.magiecSystemCode || '',
          magiecCode: ticketData.magiecCode || '',
          businessVertical: ticketData.businessVertical || '',
          invoiceRaised: ticketData.invoiceRaised || false,
          siteIdentifier: ticketData.siteIdentifier || '',
          stateName: ticketData.stateName || '',
          siteLocation: ticketData.siteLocation || ''
        };

        const ticket = await ServiceTicket.create(ticketDataToCreate);



        importedTickets.push(ticket);
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: ticketData
        });
      }
    }

    const response: APIResponse = {
      success: true,
      message: `Successfully imported ${importedTickets.length} tickets${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      data: {
        importedCount: importedTickets.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Export service tickets to Excel
// @route   GET /api/v1/services/export
// @access  Private
export const exportServiceTickets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search, 
      status, 
      priority, 
      assignedTo, 
      customer, 
      product,
      dateFrom,
      dateTo 
    } = req.query;

    const query: any = {};

    if (search) {
      query.$or = [
        { serviceRequestNumber: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { complaintDescription: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (customer) query.customer = customer;
    if (product) query.product = product;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    const tickets = await ServiceTicket.find(query)
      .populate('customer', 'name email phone')
      .populate('product', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('serviceRequestEngineer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Transform data for Excel export with the same field names as import
    const excelData = tickets.map(ticket => ({
      'SR Number': ticket.serviceRequestNumber || '',
      'SR Type': ticket.serviceRequestType || '',
      'Requested Date': ticket.requestSubmissionDate?.toISOString().split('T')[0] || '',
      'Required Date': ticket.serviceRequiredDate?.toISOString().split('T')[0] || '',
      'Engine Serial Number': ticket.engineSerialNumber || '',
      'Customer Name': ticket.customerName || '',
      'MAGIEC': ticket.magiecSystemCode || '',
      'MAGIEC Code': ticket.magiecCode || '',
      'SR Engineer': ticket.serviceRequestEngineer ? 
        `${(ticket.serviceRequestEngineer as any).firstName || ''} ${(ticket.serviceRequestEngineer as any).lastName || ''}`.trim() : '',
      'Status': ticket.serviceRequestStatus || '',
      'Complaint': ticket.complaintDescription || '',
      'Vertical': ticket.businessVertical || '',
      'Invoice': ticket.invoiceRaised ? 'Yes' : 'No',
      'Site Id': ticket.siteIdentifier || '',
      'State Name': ticket.stateName || '',
      'Site Location': ticket.siteLocation || ''
    }));

    const response: APIResponse = {
      success: true,
      message: 'Service tickets exported successfully',
      data: {
        tickets: excelData,
        totalCount: excelData.length
      }
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