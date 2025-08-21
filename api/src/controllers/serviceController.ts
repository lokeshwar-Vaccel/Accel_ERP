import { Response, NextFunction } from 'express';
import { ServiceTicket } from '../models/ServiceTicket';
import { Stock } from '../models/Stock';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { AuthenticatedRequest, APIResponse, TicketStatus, TicketPriority, QueryParams, UserRole, CustomerType, CustomerMainType, LeadStatus, UserStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';
import { TypeOfVisit, NatureOfWork, SubNatureOfWork } from '../types';
import { sendFeedbackEmail as sendFeedbackEmailUtil } from '../utils/nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Helper function to create a customer if it doesn't exist
const createCustomerIfNotExists = async (customerName: string, createdBy: string, businessVertical?: string) => {
  try {
    // First, try to find existing customer by name
    let customer = await Customer.findOne({
      name: { $regex: customerName, $options: 'i' }
    });

    if (!customer) {
      // Map businessVertical to customerType
      let customerType = CustomerType.JENARAL; // Default
      if (businessVertical) {
        const vertical = businessVertical.toUpperCase();
        switch (vertical) {
          case 'RET':
          case 'RETAIL':
            customerType = CustomerType.RETAIL;
            break;
          case 'TELECOM':
          case 'TEL':
            customerType = CustomerType.TELECOM;
            break;
          case 'EV':
          case 'ELECTRIC_VEHICLE':
            customerType = CustomerType.EV;
            break;
          case 'DG':
          case 'DIESEL_GENERATOR':
            customerType = CustomerType.DG;
            break;
          case 'JE':
          case 'JOINT_ENTERPRISE':
            customerType = CustomerType.JE;
            break;
          default:
            customerType = CustomerType.JENARAL;
        }
      }

      // Create new customer with default values
      const customerData = {
        name: customerName,
        email: '', // Default empty email
        phone: '', // Default empty phone
        addresses: [{
          id: 1,
          address: 'Default Address',
          state: '',
          district: '',
          pincode: '',
          isPrimary: true
        }],
        customerType: customerType,
        type: CustomerMainType.CUSTOMER,
        status: LeadStatus.NEW,
        createdBy: createdBy
      };

      customer = await Customer.create(customerData);
    }

    return customer;
  } catch (error) {
    console.error(`Error creating customer ${customerName}:`, error);
    throw new Error(`Failed to create customer: ${customerName}`);
  }
};

// Helper function to create a service engineer if it doesn't exist
const createServiceEngineerIfNotExists = async (engineerName: string, createdBy: string) => {
  try {
    if (!engineerName || engineerName.trim() === '') {
      throw new Error('Engineer name is required');
    }

    const cleanEngineerName = engineerName.trim();
    
    // First, try to find existing field operator by full name (exact match)
    let engineer = await User.findOne({
      role: UserRole.FIELD_OPERATOR,
      $or: [
        // Exact match for full name
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: `^${cleanEngineerName}$`,
              options: "i"
            }
          }
        },
        // Exact match for firstName or lastName
        { firstName: { $regex: `^${cleanEngineerName}$`, $options: 'i' } },
        { lastName: { $regex: `^${cleanEngineerName}$`, $options: 'i' } }
      ]
    });

    // If not found by exact match, try partial matches
    if (!engineer) {
      const nameParts = cleanEngineerName.split(' ');
      const firstName = nameParts[0] || cleanEngineerName;
      const lastName = nameParts.slice(1).join(' ') || '';
      
      engineer = await User.findOne({
        role: UserRole.FIELD_OPERATOR,
        $or: [
          // Match by firstName and lastName combination
          {
            firstName: { $regex: `^${firstName}$`, $options: 'i' },
            lastName: { $regex: `^${lastName}$`, $options: 'i' }
          },
          // Match by firstName only (if lastName is empty)
          ...(lastName === '' ? [{ firstName: { $regex: `^${firstName}$`, $options: 'i' } }] : []),
          // Match by full name in firstName field
          { firstName: { $regex: `^${cleanEngineerName}$`, $options: 'i' } },
          // Match by full name in lastName field
          { lastName: { $regex: `^${cleanEngineerName}$`, $options: 'i' } }
        ]
      });
    }

    if (engineer) {
      return engineer;
    }

    // If not found, create new field operator
    
    // Split name by space: first word is firstName, rest is lastName
    const nameParts = cleanEngineerName.split(' ');
    const firstName = nameParts[0] || cleanEngineerName;
    const lastName = nameParts.slice(1).join(' ') || 'Unknown'; // Set to "Unknown" if only one word
    
    // Generate email from firstName: firstName@sunpowerservice.com
    const cleanFirstName = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseEmail = `${cleanFirstName || 'user'}@sunpowerservice.com`;
    let email = baseEmail;
    let counter = 1;
    
    // Check if email already exists and generate a unique one
    while (await User.findOne({ email })) {
      email = `${cleanFirstName || 'user'}${counter}@sunpowerservice.com`;
      counter++;
    }

    // Hash the default password "12345"
    const hashedPassword = await bcrypt.hash('12345', 12);

    // Create new field operator with default values
    const engineerData = {
      firstName: firstName,
      lastName: lastName, // This will be "Unknown" if only one word
      email: email,
      password: hashedPassword,
      role: UserRole.FIELD_OPERATOR,
      status: UserStatus.ACTIVE,
      moduleAccess: [
        { module: 'dashboard', access: true, permission: 'read' },
        { module: 'service_management', access: true, permission: 'write' },
        { module: 'amc_management', access: true, permission: 'write' },
        { module: 'inventory_management', access: true, permission: 'write' },
        { module: 'product_management', access: true, permission: 'write' }
      ],
      createdBy: createdBy
    };

    engineer = await User.create(engineerData);
    
    return engineer;
  } catch (error) {
    console.error(`Error creating field operator ${engineerName}:`, error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key error')) {
        throw new Error(`Field operator with email already exists: ${engineerName}`);
      } else if (error.message.includes('validation failed')) {
        throw new Error(`Validation failed for field operator: ${engineerName} - ${error.message}`);
      } else {
        throw new Error(`Failed to create field operator: ${engineerName} - ${error.message}`);
      }
    }
    
    throw new Error(`Failed to create field operator: ${engineerName}`);
  }
};

// @desc    Get all service tickets
// @route   GET /api/v1/services
// @access  Private
export const getServiceTickets = async (
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
      priority,
      customer,
      dateFrom,
      dateTo,
      slaStatus
    } = req.query as QueryParams & {
      priority?: TicketPriority;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      slaStatus?: 'on_track' | 'breached' | 'met' | 'no_sla';
      status?: string;
      assignedTo?: string;
    };

    // Extract service-specific parameters separately
    const status = req.query.status as string;
    const assignedTo = req.query.assignedTo as string;

    // Build query - Clean and optimized approach
    const query: any = {};
    
    // 1. Status filter
    if (status) {
      query.ServiceRequestStatus = status;
    }
    
    // 2. Search filter
    if (search) {
      query.$or = [
        { ServiceRequestNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 3. AssignedTo filter
    if (assignedTo && assignedTo.trim() !== '') {
      const assignedToConditions = [
        { assignedTo: new mongoose.Types.ObjectId(assignedTo) },
        { ServiceEngineerName: new mongoose.Types.ObjectId(assignedTo) }
      ];
      
      // If we already have search conditions, combine them
      if (query.$or) {
        // We have both search and assignedTo - need to use $and
        query.$and = [
          { $or: query.$or }, // Search conditions
          { $or: assignedToConditions } // AssignedTo conditions
        ];
        delete query.$or; // Remove the original $or
      } else {
        // Only assignedTo filter
        query.$or = assignedToConditions;
      }
    }
    
    // Other filters
    if (priority) {
      query.priority = priority;
    }
    
    if (customer) {
      query.customer = customer;
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    let tickets: any[] = [];
    let total = 0;

    // Use regular find for simple queries
    tickets = await ServiceTicket.find(query)
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('ServiceEngineerName', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('partsUsed.product', 'name category price')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    total = await ServiceTicket.countDocuments(query);

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
      .populate('products', 'name category brand modelNumber specifications')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('ServiceEngineerName', 'firstName lastName email phone')
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
    // Calculate SLA deadline based on priority (default to medium)
    const slaHours = 72; // Default to medium priority (72 hours)
    
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    // Prepare ticket data with standardized fields
    const ticketData = {
      ...req.body,
      slaDeadline,
      createdBy: req.user!.id,
      // Map legacy fields to standardized fields if not provided
      customerName: req.body.customerName || (req.body.customer ? 'Customer Name' : ''),
      complaintDescription: req.body.complaintDescription || '',
      serviceRequestEngineer: req.body.serviceRequestEngineer || req.body.assignedTo,
      serviceRequestStatus: req.body.serviceRequestStatus || TicketStatus.OPEN,
      serviceRequestType: req.body.serviceRequestType || req.body.serviceType || 'repair',
      requestSubmissionDate: req.body.requestSubmissionDate ? (typeof req.body.requestSubmissionDate === 'string' ? new Date(req.body.requestSubmissionDate.split('T')[0] + 'T00:00:00.000Z') : new Date(req.body.requestSubmissionDate)) : new Date(),
      serviceRequiredDate: req.body.serviceRequiredDate || req.body.scheduledDate || new Date(),
      engineSerialNumber: req.body.engineSerialNumber || req.body.serialNumber || undefined,
      businessVertical: req.body.businessVertical || '',
      siteIdentifier: req.body.siteIdentifier || '',
      stateName: req.body.stateName || '',
      siteLocation: req.body.siteLocation || '',
      // Pass the ServiceRequestNumber from Excel to the model
      ServiceRequestNumber: req.body.serviceRequestNumber,
    };

    // Check if ticket with same service request number already exists
    if (ticketData.ServiceRequestNumber) {
      const existingTicket = await ServiceTicket.findOne({
        ServiceRequestNumber: ticketData.ServiceRequestNumber
      });
      
      if (existingTicket) {
        return next(new AppError(`Ticket with service request number "${ticketData.ServiceRequestNumber}" already exists in the system`, 400));
      }
    }

    const ticket = await ServiceTicket.create(ticketData);

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand')
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
    


    // Set default SLA deadline (72 hours for medium priority)
    const hoursToAdd = 72;
    
    // Only update SLA deadline if the ticket is not already resolved or closed
    if (ticket.ServiceRequestStatus !== TicketStatus.RESOLVED && ticket.ServiceRequestStatus !== TicketStatus.CLOSED) {
      req.body.slaDeadline = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    }
    
    // Handle field mappings
    if (req.body.assignedTo) {
      req.body.serviceRequestEngineer = req.body.assignedTo;
    }
    if (req.body.serviceRequestEngineer) {
      req.body.assignedTo = req.body.serviceRequestEngineer;
    }
    if (req.body.complaintDescription) {
      req.body.description = req.body.complaintDescription;
    }

    // Handle ServiceRequestStatus field (both uppercase and lowercase)
    if (req.body.ServiceRequestStatus && !req.body.serviceRequestStatus) {
      req.body.serviceRequestStatus = req.body.ServiceRequestStatus;
      delete req.body.ServiceRequestStatus;
    }

    // Validate ServiceRequestStatus if provided
    if (req.body.serviceRequestStatus) {
      const validStatuses = Object.values(TicketStatus);
      if (!validStatuses.includes(req.body.serviceRequestStatus)) {
        return next(new AppError(`Invalid ServiceRequestStatus. Must be one of: ${validStatuses.join(', ')}`, 400));
      }
      

      
      // Map serviceRequestStatus to ServiceRequestStatus for database update
      req.body.ServiceRequestStatus = req.body.serviceRequestStatus;
      delete req.body.serviceRequestStatus;
      
      // Set completedDate if status is being changed to resolved or closed
      if ((req.body.ServiceRequestStatus === TicketStatus.RESOLVED || req.body.ServiceRequestStatus === TicketStatus.CLOSED) && 
          ticket.ServiceRequestStatus !== req.body.ServiceRequestStatus) {
        req.body.completedDate = new Date();
      }
    }

    const updatedTicket = await ServiceTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('ServiceEngineerName', 'firstName lastName email');



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
    console.error('Error updating service ticket:', error);
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
    
    // Update status to resolved if it was open
    if (ticket.ServiceRequestStatus === TicketStatus.OPEN) {
      ticket.ServiceRequestStatus = TicketStatus.RESOLVED;
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
    ticket.ServiceRequestStatus = TicketStatus.RESOLVED;
    ticket.completedDate = new Date();

    await ticket.save();

    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
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
    ticket.ServiceRequestStatus = status;
    
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
          .populate('products', 'name category')
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
              populatedTicket.ServiceRequestNumber || '',
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
      .populate('products', 'name category brand')
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

    if (!Array.isArray(tickets)) {
      return next(new AppError('Tickets must be an array', 400));
    }

    // Handle empty array case
    if (tickets.length === 0) {
      const response: APIResponse = {
        success: true,
        message: 'No tickets provided for import',
        data: {
          importedCount: 0,
          duplicateCount: 0,
          errorCount: 0,
          errors: []
        }
      };
      res.status(200).json(response);
      return;
    }

    // Validate ticket structure
    const importedTickets = [];
    const errors = [];
    const duplicates = [];

    console.log(`Starting bulk import of ${tickets.length} tickets`);

    try {
      for (let i = 0; i < tickets.length; i++) {
        const ticketData = tickets[i];
        console.log(`Processing ticket ${i + 1}/${tickets.length}: ${ticketData.SRNumber}`);
        
        try {
          // Handle SREngineer - could be ID or name
          let serviceRequestEngineer = ticketData.SREngineer;
          
          if (serviceRequestEngineer && serviceRequestEngineer.trim() !== '') {
            // First try to find by ID (if it's a valid ObjectId)
            let engineer = null;
            
            // Check if it's a valid ObjectId
            if (/^[0-9a-fA-F]{24}$/.test(serviceRequestEngineer)) {
              engineer = await User.findById(serviceRequestEngineer);
              if (engineer) {
                // Check if the user has FIELD_OPERATOR role
                if (engineer.role !== UserRole.FIELD_OPERATOR) {
                  engineer = null; // Reset to null so we create a new FIELD_OPERATOR user
                }
              }
            }
            
            // If not found by ID or not a valid ObjectId, try to find by name or create new one
            if (!engineer) {
              try {
                engineer = await createServiceEngineerIfNotExists(serviceRequestEngineer, req.user!.id);
              } catch (engineerError) {
                console.error(`Error processing engineer "${serviceRequestEngineer}":`, engineerError);
                throw engineerError;
              }
            }
            
            serviceRequestEngineer = engineer._id;
          } else {
            serviceRequestEngineer = null;
          }

          // Find customer by name
          let customer = null;
          if (ticketData.CustomerName) {
            customer = await createCustomerIfNotExists(ticketData.CustomerName, req.user!.id, ticketData.CustomerType);
          }

          // Find product by name
          let product = null;
          if (ticketData.productName) {
            product = await Product.findOne({
              name: { $regex: ticketData.productName, $options: 'i' } }
            );
          }

          // Check if ticket with same SR number already exists (only if SRNumber is provided)
          if (ticketData.SRNumber && ticketData.SRNumber.trim() !== '') {
            const existingTicket = await ServiceTicket.findOne({
              ServiceRequestNumber: ticketData.SRNumber
            });
            
            if (existingTicket) {
              duplicates.push({
                row: i + 1,
                error: `Ticket with SR number "${ticketData.SRNumber}" already exists in the system`,
                data: ticketData
              });
              continue; // Skip this ticket and move to the next one
            }
          }

          // Map Excel status to application status
          let mappedStatus = TicketStatus.OPEN;
          if (ticketData.SRStatus) {
            // Convert to lowercase for consistent mapping
            const statusValue = ticketData.SRStatus.toLowerCase().trim();
            
            // Direct mapping to enum values
            if (statusValue === 'resolved') {
              mappedStatus = TicketStatus.RESOLVED;
            } else if (statusValue === 'closed') {
              mappedStatus = TicketStatus.CLOSED;
            } else if (statusValue === 'new') {
              mappedStatus = TicketStatus.OPEN;
            } else if (statusValue === 'cancelled') {
              mappedStatus = TicketStatus.CLOSED;
            } else if (statusValue === 'in progress' || statusValue === 'in_progress') {
              mappedStatus = TicketStatus.RESOLVED;
            }
          }

          // Note: SRNumber is optional - will be auto-generated if not provided

          // Helper function to properly parse dates with time from Excel
          const parseExcelDateTime = (dateValue: any) => {
            if (!dateValue) return new Date();
            
            // If it's already a Date object, return as is
            if (dateValue instanceof Date) {
              return dateValue;
            }
            
            // If it's a string, try to parse it
            if (typeof dateValue === 'string') {
              // Try to parse as ISO string first
              const isoDate = new Date(dateValue);
              if (!isNaN(isoDate.getTime())) {
                return isoDate;
              }
              
              // Try to parse as Excel date string
              const excelDate = new Date(dateValue);
              if (!isNaN(excelDate.getTime())) {
                return excelDate;
              }
            }
            
            // If it's a number (Excel date number), convert it
            if (typeof dateValue === 'number') {
              // Excel dates are days since 1900-01-01
              const excelEpoch = new Date(1900, 0, 1);
              const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
              return date;
            }
            
            return new Date();
          };

          const ticketDataToCreate = {
            // Map Excel fields to new database field names
            ServiceRequestNumber: ticketData.SRNumber && ticketData.SRNumber.trim() !== '' ? ticketData.SRNumber : undefined,
            CustomerType: ticketData.CustomerType || '',
            CustomerName: ticketData.CustomerName || '',
            EngineSerialNumber: ticketData.EngineNo || '',
            EngineModel: ticketData.ModelCode || '',
            KVA: ticketData.KVA || '',
            ServiceRequestDate: parseExcelDateTime(ticketData.RequestedDate),
            ServiceAttendedDate: parseExcelDateTime(ticketData.RequestedDate), // Same as ServiceRequestDate as per requirement
            HourMeterReading: ticketData.AttendedHrs || '',
            TypeofService: ticketData.SRType || '',
            SiteID: ticketData.SITEID || '',
            ServiceEngineerName: serviceRequestEngineer || undefined, // Store engineer ID reference (only if exists)
            ComplaintCode: ticketData.ComplaintCode || '',
            ComplaintDescription: ticketData.ComplaintDescription || '',
            ResolutionDescription: ticketData.ResolutionDesc || '',
            eFSRNumber: ticketData.eFSRNo || '',
            eFSRClosureDateAndTime: ticketData.eFSRClosureDateTime ? parseExcelDateTime(ticketData.eFSRClosureDateTime) : undefined,
            ServiceRequestStatus: mappedStatus,
            OemName: ticketData.OEMName || '',
            
            // Essential fields for system functionality
            requestSubmissionDate: new Date(),
            
            // Legacy fields for backward compatibility
            customer: customer?._id,
            products: product?._id ? [product._id] : [],
            serviceRequestEngineer: serviceRequestEngineer || undefined, // Add this field (only if exists)
            createdBy: req.user!.id,
            priority: TicketPriority.MEDIUM,
            description: ticketData.ComplaintDescription || '',
            businessVertical: ticketData.CustomerType || 'retail',
            scheduledDate: parseExcelDateTime(ticketData.RequestedDate)
          };
          
          const ticket = await ServiceTicket.create(ticketDataToCreate);

          importedTickets.push(ticket);
        } catch (error) {
          console.error(`Error processing ticket ${i + 1} (${ticketData.SRNumber}):`, error);
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: ticketData
          });
        }
      }
    } catch (loopError) {
      console.error('Error in bulk import loop:', loopError);
      errors.push({
        row: 0,
        error: `Bulk import loop error: ${loopError instanceof Error ? loopError.message : 'Unknown error'}`,
        data: null
      });
    }


    
    const response: APIResponse = {
      success: true,
      message: `Successfully imported ${importedTickets.length} tickets${duplicates.length > 0 ? `, ${duplicates.length} duplicates skipped` : ''}${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: {
        importedCount: importedTickets.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        duplicates: duplicates.length > 0 ? duplicates : undefined,
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
        { ServiceRequestNumber: { $regex: search, $options: 'i' } },
        { CustomerName: { $regex: search, $options: 'i' } },
        { ComplaintDescription: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.ServiceRequestStatus = status;
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
      .populate('products', 'name category brand')
      .populate('assignedTo', 'firstName lastName email')
      .populate('ServiceEngineerName', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Helper function to format service engineer name
    const formatServiceEngineerName = (engineer: any): string => {
      if (!engineer) return '';
      
      if (typeof engineer === 'string') return engineer;
      
      if (typeof engineer === 'object' && engineer.firstName) {
        const firstName = engineer.firstName || '';
        const lastName = engineer.lastName || '';
        
        // If lastName is "Unknown", don't include it in the export
        if (lastName === 'Unknown' || lastName === '') {
          return firstName;
        }
        
        return `${firstName} ${lastName}`.trim();
      }
      
      return '';
    };

    // Helper function to format date for Excel
    const formatDateForExcel = (date: any): string => {
      if (!date) return '';
      
      try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        // Format as YYYY-MM-DD HH:mm:ss
        return dateObj.toISOString().replace('T', ' ').substring(0, 19);
      } catch (error) {
        return '';
      }
    };

    // Transform data for Excel export with the new field names
    const excelData = tickets.map(ticket => {
      // Get service engineer name
      const serviceEngineerName = formatServiceEngineerName(ticket.ServiceEngineerName);
      
      // Get customer name (prefer CustomerName field, fallback to populated customer)
      let customerName = ticket.CustomerName || '';
      if (!customerName && ticket.customer && typeof ticket.customer === 'object') {
        customerName = (ticket.customer as any).name || '';
      }
      
      // Get customer type (prefer CustomerType field, fallback to populated customer)
      let customerType = ticket.CustomerType || '';
      if (!customerType && ticket.customer && typeof ticket.customer === 'object') {
        customerType = (ticket.customer as any).customerType || '';
      }

      return {
        'SRNumber': ticket.ServiceRequestNumber || '',
        'CustomerType': customerType,
        'CustomerName': customerName,
        'EngineNo': ticket.EngineSerialNumber || '',
        'ModelCode': ticket.EngineModel || '',
        'KVA': ticket.KVA || '',
        'RequestedDate': formatDateForExcel(ticket.ServiceRequestDate),
        'AttendedHrs': ticket.HourMeterReading || '',
        'SRType': ticket.TypeofService || '',
        'SITEID': ticket.SiteID || '',
        'SREngineer': serviceEngineerName,
        'ComplaintCode': ticket.ComplaintCode || '',
        'ComplaintDescription': ticket.ComplaintDescription || '',
        'ResolutionDesc': ticket.ResolutionDescription || '',
        'eFSRNo': ticket.eFSRNumber || '',
        'eFSRClosureDateTime': formatDateForExcel(ticket.eFSRClosureDateAndTime),
        'SRStatus': ticket.ServiceRequestStatus || '',
        'OEMName': ticket.OemName || ''
      };
    });



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
    console.error('Error in exportServiceTickets:', error);
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
    const openTickets = await ServiceTicket.countDocuments({ ServiceRequestStatus: TicketStatus.OPEN });
    const resolvedTickets = await ServiceTicket.countDocuments({ ServiceRequestStatus: TicketStatus.RESOLVED });
    const closedTickets = await ServiceTicket.countDocuments({ ServiceRequestStatus: TicketStatus.CLOSED });
    const overdueTickets = await ServiceTicket.countDocuments({ 
      slaDeadline: { $lt: new Date() },
      ServiceRequestStatus: { $in: [TicketStatus.OPEN] }
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
          ServiceRequestStatus: TicketStatus.RESOLVED,
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
        closedTickets,
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