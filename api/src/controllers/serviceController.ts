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
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { DGDetails } from '../models/DGDetails';

// Helper function to generate service request number
const generateServiceRequestNumber = async (): Promise<string> => {
  try {
    const counter = await TransactionCounter.findOneAndUpdate(
      { type: 'service_request' },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true }
    );
    
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year (e.g., "25" for 2025)
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero (e.g., "08" for August)
    const paddedCount = counter.sequence.toString().padStart(4, '0'); // Sequence number padded to 4 digits
    
    // Format: SPS25080001 (SPS = company prefix, 25 = year, 08 = month, 0001 = sequence)
    return `SPS${year}${month}${paddedCount}`;
  } catch (error) {
    console.error('Error generating service request number:', error);
    throw new Error('Failed to generate service request number');
  }
};

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
    
    // First, try to find existing field engineer by full name (exact match)
    let engineer = await User.findOne({
      role: UserRole.FIELD_ENGINEER,
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
        role: UserRole.FIELD_ENGINEER,
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

    // If not found, create new field engineer
    
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

    // Create new field engineer with default values
    const engineerData = {
      firstName: firstName,
      lastName: lastName, // This will be "Unknown" if only one word
      email: email,
      password: hashedPassword,
      role: UserRole.FIELD_ENGINEER,
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
          console.error(`Error creating field engineer ${engineerName}:`, error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('duplicate key error')) {
        throw new Error(`Field engineer with email already exists: ${engineerName}`);
      } else if (error.message.includes('validation failed')) {
                  throw new Error(`Validation failed for field engineer: ${engineerName} - ${error.message}`);
      } else {
                  throw new Error(`Failed to create field engineer: ${engineerName} - ${error.message}`);
      }
    }
    
          throw new Error(`Failed to create field engineer: ${engineerName}`);
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
      // Handle both string and ObjectId customer references
      if (mongoose.Types.ObjectId.isValid(customer)) {
        query.customer = new mongoose.Types.ObjectId(customer);
        console.log('Customer filter: Using ObjectId:', customer);
      } else {
        query.customer = customer;
        console.log('Customer filter: Using string:', customer);
      }
      console.log('Final customer query:', query.customer);
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    console.log('Service tickets query:', JSON.stringify(query, null, 2));
    console.log('Query parameters:', { page, limit, sort, search, priority, customer, dateFrom, dateTo, slaStatus, status, assignedTo });

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

    console.log(`Found ${tickets.length} tickets out of ${total} total`);
    if (customer) {
      console.log(`Filtered by customer: ${customer}`);
      console.log('Sample tickets:', tickets.slice(0, 2).map(t => ({ 
        _id: t._id, 
        customer: t.customer?._id || t.customer,
        customerName: t.customer?.name || 'N/A',
        EngineSerialNumber: t.EngineSerialNumber || 'N/A',
        HourMeterReading: t.HourMeterReading || 'N/A',
        ServiceRequestDate: t.ServiceRequestDate || 'N/A'
      })));
      
      // Log the first few tickets in detail to see the structure
      if (tickets.length > 0) {
        console.log('First ticket full structure:', JSON.stringify(tickets[0], null, 2));
      }
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
    // Enhanced validation for manual ticket creation
    const {
      customer,
      customerName,
      engineSerialNumber,
      engineModel,
      kva,
      selectedAddress,
      typeOfService,
      typeOfVisit,
      natureOfWork,
      subNatureOfWork,
      businessVertical,
      complaintDescription,
      hourMeterReading,
      HourMeterReading,
      serviceRequestEngineer,
      assignedTo,
      scheduledDate,
      serviceRequiredDate,
      serviceRequestNumber,
      serviceRequestType,
      products,
      serviceCharge,
      convenienceCharges
    } = req.body;

    // Debug logging for request body
    console.log('=== DEBUG: Request Body ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    console.log('typeOfService:', typeOfService);
    console.log('typeOfService type:', typeof typeOfService);
    console.log('typeOfService truthy check:', !!typeOfService);
    console.log('typeOfService in req.body:', req.body.typeOfService);
    console.log('engineModel:', engineModel);
    console.log('kva:', kva);
    console.log('All keys in req.body:', Object.keys(req.body));
    console.log('========================================');





    // Validate required fields
    if (!customer) {
      return next(new AppError('Customer is required for ticket creation', 400));
    }

    if (!customerName || customerName.trim() === '') {
      return next(new AppError('Customer name is required for ticket creation', 400));
    }

    if (!typeOfService || typeOfService === '' || (typeof typeOfService === 'string' && typeOfService.trim() === '')) {
      return next(new AppError('Type of service is required for ticket creation', 400));
    }

    // Generate service request number if not provided
    let finalServiceRequestNumber = serviceRequestNumber;
    if (!finalServiceRequestNumber || finalServiceRequestNumber.trim() === '') {
      try {
        finalServiceRequestNumber = await generateServiceRequestNumber();
      } catch (counterError) {
        console.error('Error generating service request number:', counterError);
        return next(new AppError('Failed to generate service request number', 500));
      }
    }

    // Check if ticket with same service request number already exists
    if (finalServiceRequestNumber) {
      const existingTicket = await ServiceTicket.findOne({
        ServiceRequestNumber: finalServiceRequestNumber
      });
      
      if (existingTicket) {
        return next(new AppError(`Ticket with service request number "${finalServiceRequestNumber}" already exists in the system`, 400));
      }
    }

    // Handle service engineer assignment
    let serviceEngineerId = null;
    if (serviceRequestEngineer || assignedTo) {
      const engineerId = serviceRequestEngineer || assignedTo;
      
      // Check if it's a valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(engineerId)) {
        const engineer = await User.findById(engineerId);
        if (engineer && engineer.role === UserRole.FIELD_ENGINEER) {
          serviceEngineerId = engineer._id;
        } else {
          return next(new AppError('Invalid service engineer ID or engineer does not have field engineer role', 400));
        }
      } else {
        return next(new AppError('Invalid service engineer ID format', 400));
      }
    }

    // Validate customer exists
    let customerDoc = null;
    if (/^[0-9a-fA-F]{24}$/.test(customer)) {
      customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return next(new AppError('Customer not found', 404));
      }
    } else {
      return next(new AppError('Invalid customer ID format', 400));
    }

    // Validate products if provided
    let productIds = [];
    if (products && Array.isArray(products) && products.length > 0) {
      for (const productId of products) {
        if (/^[0-9a-fA-F]{24}$/.test(productId)) {
          const product = await Product.findById(productId);
          if (!product) {
            return next(new AppError(`Product with ID ${productId} not found`, 404));
          }
          productIds.push(productId);
        } else {
          return next(new AppError(`Invalid product ID format: ${productId}`, 400));
        }
      }
    }

    // Prepare comprehensive ticket data with proper field mapping
    const ticketData: any = {
      // Core service request information
      ServiceRequestNumber: finalServiceRequestNumber,
      serviceRequestType: serviceRequestType || 'manual',
      requestSubmissionDate: new Date(),
      
      // Customer and engine information
      customer: customerDoc._id,
      CustomerName: customerName.trim(),
      CustomerType: businessVertical || customerDoc.customerType || 'retail',
      EngineSerialNumber: engineSerialNumber !== undefined && engineSerialNumber !== null ? engineSerialNumber.trim() : undefined,
      EngineModel: engineModel !== undefined && engineModel !== null && engineModel !== '' ? engineModel.trim() : undefined,
      KVA: kva !== undefined && kva !== null && kva !== '' ? String(kva) : undefined,
      
      // Location and service details
      SiteID: selectedAddress !== undefined && selectedAddress !== null ? selectedAddress.trim() : undefined,
      TypeofService: typeOfService ? typeOfService.trim() : '',
      typeOfVisit: typeOfVisit || undefined,
      natureOfWork: natureOfWork || undefined,
      subNatureOfWork: subNatureOfWork || undefined,
      ComplaintDescription: complaintDescription !== undefined && complaintDescription !== null ? complaintDescription.trim() : undefined,
      HourMeterReading: (hourMeterReading ?? HourMeterReading) !== undefined && (hourMeterReading ?? HourMeterReading) !== null && String(hourMeterReading ?? HourMeterReading) !== '' ? String(hourMeterReading ?? HourMeterReading).trim() : undefined,
      
      // Service engineer and scheduling
      ServiceEngineerName: serviceEngineerId,
      assignedTo: serviceEngineerId, // For backward compatibility
      ServiceRequestDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      ServiceAttendedDate: serviceRequiredDate ? new Date(serviceRequiredDate) : new Date(),
      
      // Products and service charge
      products: productIds,
      serviceCharge: convenienceCharges !== undefined && convenienceCharges !== null && convenienceCharges !== '' ? Number(convenienceCharges) : (serviceCharge || 0),
      
      // System fields
      createdBy: req.user!.id,
      ServiceRequestStatus: TicketStatus.OPEN,
      serviceRequestStatus: TicketStatus.OPEN, // For backward compatibility
      
      // Set default SLA deadline (72 hours for medium priority)
      slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      
      // Additional fields for better tracking
      priority: TicketPriority.MEDIUM,
      description: complaintDescription !== undefined && complaintDescription !== null ? complaintDescription.trim() : undefined
    };



    // Debug logging for ticket data
    console.log('=== DEBUG: Ticket Data ===');
    console.log('EngineModel in ticketData:', ticketData.EngineModel);
    console.log('KVA in ticketData:', ticketData.KVA);
    console.log('Full ticketData:', JSON.stringify(ticketData, null, 2));
    console.log('========================================');

    // Create the ticket
    const ticket = await ServiceTicket.create(ticketData);



    // Populate the created ticket with related data
    const populatedTicket = await ServiceTicket.findById(ticket._id)
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand modelNumber specifications')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('ServiceEngineerName', 'firstName lastName email phone')
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
      data: { 
        ticket: populatedTicket,
        serviceRequestNumber: finalServiceRequestNumber
      }
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating service ticket:', error);
    
    // Enhanced error handling
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return next(new AppError(`Validation failed: ${validationErrors.join(', ')}`, 400));
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new AppError(`${field} already exists in the system`, 400));
    }
    
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

    // Extract and validate update data
    const {
      customer,
      customerName,
      engineSerialNumber,
      engineModel,
      kva,
      selectedAddress,
      typeOfService,
      typeOfVisit,
      natureOfWork,
      subNatureOfWork,
      businessVertical,
      complaintDescription,
      hourMeterReading,
      HourMeterReading,
      serviceRequestEngineer,
      assignedTo,
      scheduledDate,
      serviceRequiredDate,
      serviceRequestNumber,
      serviceRequestType,
      products,
      serviceCharge,
      serviceRequestStatus,
      ServiceRequestStatus,
      convenienceCharges
    } = req.body;



    // Prepare update data with proper field mapping
    const updateData: any = {};

    // Handle customer updates
    if (customer) {
      if (/^[0-9a-fA-F]{24}$/.test(customer)) {
        const customerDoc = await Customer.findById(customer);
        if (!customerDoc) {
          return next(new AppError('Customer not found', 404));
        }
        updateData.customer = customerDoc._id;
      } else {
        return next(new AppError('Invalid customer ID format', 400));
      }
    }

    // Handle customer name
    if (customerName !== undefined) {
      if (!customerName || customerName.trim() === '') {
        return next(new AppError('Customer name cannot be empty', 400));
      }
      updateData.CustomerName = customerName.trim();
    }

    // Handle engine information
    if (engineSerialNumber !== undefined) {
      updateData.EngineSerialNumber = engineSerialNumber !== null ? engineSerialNumber.trim() : undefined;
    }
          if (engineModel !== undefined) {
        updateData.EngineModel = engineModel !== null && engineModel !== '' ? engineModel.trim() : undefined;
      }
      if (kva !== undefined) {
        updateData.KVA = kva !== null && kva !== '' ? String(kva) : undefined;
      }

    // Handle location and service details
    if (selectedAddress !== undefined) {
      updateData.SiteID = selectedAddress !== null ? selectedAddress.trim() : undefined;
    }
    // Hour meter reading for manual tickets
    if (hourMeterReading !== undefined || HourMeterReading !== undefined) {
      const hmr = (hourMeterReading ?? HourMeterReading);
      updateData.HourMeterReading = hmr !== null && String(hmr) !== '' ? String(hmr).trim() : undefined;
    }
    if (typeOfService !== undefined) {
      updateData.TypeofService = typeOfService && typeOfService.trim() !== '' ? typeOfService.trim() : undefined;
    }
    if (typeOfVisit !== undefined) {
      updateData.typeOfVisit = typeOfVisit;
      console.log('Setting typeOfVisit:', typeOfVisit);
    }
    if (natureOfWork !== undefined) {
      updateData.natureOfWork = natureOfWork;
      console.log('Setting natureOfWork:', natureOfWork);
    }
    if (subNatureOfWork !== undefined) {
      updateData.subNatureOfWork = subNatureOfWork;
      console.log('Setting subNatureOfWork:', subNatureOfWork);
    }
    if (businessVertical !== undefined) {
      updateData.CustomerType = businessVertical;
    }
    if (complaintDescription !== undefined) {
      updateData.ComplaintDescription = complaintDescription !== null ? complaintDescription.trim() : undefined;
      updateData.description = complaintDescription !== null ? complaintDescription.trim() : undefined; // For backward compatibility
    }

    // Handle service engineer assignment
    if (serviceRequestEngineer || assignedTo) {
      const engineerId = serviceRequestEngineer || assignedTo;
      
      if (/^[0-9a-fA-F]{24}$/.test(engineerId)) {
        const engineer = await User.findById(engineerId);
        if (engineer && engineer.role === UserRole.FIELD_ENGINEER) {
          updateData.ServiceEngineerName = engineer._id;
          updateData.assignedTo = engineer._id; // For backward compatibility
        } else {
          return next(new AppError('Invalid service engineer ID or engineer does not have field engineer role', 400));
        }
      } else {
        return next(new AppError('Invalid service engineer ID format', 400));
      }
    }

    // Handle scheduling
    if (scheduledDate !== undefined) {
      updateData.ServiceRequestDate = scheduledDate ? new Date(scheduledDate) : undefined;
    }
    if (serviceRequiredDate !== undefined) {
      updateData.ServiceAttendedDate = serviceRequiredDate ? new Date(serviceRequiredDate) : undefined;
    }

    // Handle service request number (with duplicate check)
    if (serviceRequestNumber !== undefined && serviceRequestNumber !== ticket.ServiceRequestNumber) {
      if (serviceRequestNumber && serviceRequestNumber.trim() !== '') {
        const existingTicket = await ServiceTicket.findOne({
          ServiceRequestNumber: serviceRequestNumber,
          _id: { $ne: ticket._id }
        });
        
        if (existingTicket) {
          return next(new AppError(`Ticket with service request number "${serviceRequestNumber}" already exists in the system`, 400));
        }
        updateData.ServiceRequestNumber = serviceRequestNumber.trim();
      } else {
        updateData.ServiceRequestNumber = undefined;
      }
    }

    // Handle service request type
    if (serviceRequestType !== undefined) {
      updateData.serviceRequestType = serviceRequestType;
    }

    // Handle products
    if (products !== undefined) {
      if (Array.isArray(products)) {
        const productIds = [];
        for (const productId of products) {
          if (/^[0-9a-fA-F]{24}$/.test(productId)) {
            const product = await Product.findById(productId);
            if (!product) {
              return next(new AppError(`Product with ID ${productId} not found`, 404));
            }
            productIds.push(productId);
          } else {
            return next(new AppError(`Invalid product ID format: ${productId}`, 400));
          }
        }
        updateData.products = productIds;
      } else {
        return next(new AppError('Products must be an array', 400));
      }
    }

    // Handle service charge
    if (serviceCharge !== undefined) {
      updateData.serviceCharge = serviceCharge || 0;
    }
    if (convenienceCharges !== undefined) {
      const parsed = typeof convenienceCharges === 'string' ? parseFloat(convenienceCharges) : Number(convenienceCharges);
      updateData.serviceCharge = isNaN(parsed) ? 0 : parsed;
    }

    // Handle status updates
    const statusToUpdate = serviceRequestStatus || ServiceRequestStatus;
    if (statusToUpdate) {
      const validStatuses = Object.values(TicketStatus);
      if (!validStatuses.includes(statusToUpdate)) {
        return next(new AppError(`Invalid ServiceRequestStatus. Must be one of: ${validStatuses.join(', ')}`, 400));
      }
      
      updateData.ServiceRequestStatus = statusToUpdate;
      updateData.serviceRequestStatus = statusToUpdate; // For backward compatibility
      
      // Set completedDate if status is being changed to resolved or closed
      if ((statusToUpdate === TicketStatus.RESOLVED || statusToUpdate === TicketStatus.CLOSED) && 
          ticket.ServiceRequestStatus !== statusToUpdate) {
        updateData.completedDate = new Date();
      }
    }

    // Set default SLA deadline (72 hours for medium priority) if status is open
    if (updateData.ServiceRequestStatus === TicketStatus.OPEN || 
        (!updateData.ServiceRequestStatus && ticket.ServiceRequestStatus === TicketStatus.OPEN)) {
      updateData.slaDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    }



    const updatedTicket = await ServiceTicket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand modelNumber specifications')
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('ServiceEngineerName', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName email');



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
  } catch (error: any) {
    console.error('Error updating service ticket:', error);
    
    // Enhanced error handling
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return next(new AppError(`Validation failed: ${validationErrors.join(', ')}`, 400));
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return next(new AppError(`${field} already exists in the system`, 400));
    }
    
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
          .populate('customer', 'name email phone addresses')
          .populate('products', 'name category')
          .populate('assignedTo', 'firstName lastName');

        if (populatedTicket && populatedTicket.customer) {
          const customer = populatedTicket.customer as any;
          
          // Get primary address email if available
          const getPrimaryAddressEmail = (customer: any): string | null => {
            if (!customer?.addresses || !Array.isArray(customer.addresses)) {
              return customer?.email || null;
            }
            
            const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
            return primaryAddress?.email || customer?.email || null;
          };
          
          const primaryEmail = getPrimaryAddressEmail(customer);
          
          if (primaryEmail) {
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
              customerEmail: primaryEmail,
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
              primaryEmail,
              customer.name || 'Customer',
              populatedTicket.ServiceRequestNumber || '',
              feedbackUrl,
              populatedTicket
            ).catch(error => {
              console.error('Failed to send feedback email:', error);
            });
          } else {
            console.error('Customer primary address email not found for ticket:', ticket._id);
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
                // Check if the user has FIELD_ENGINEER role
                if (engineer.role !== UserRole.FIELD_ENGINEER) {
                  engineer = null; // Reset to null so we create a new FIELD_ENGINEER user
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
            
            // Visit Details fields
            typeOfVisit: ticketData.typeOfVisit || undefined,
            natureOfWork: ticketData.natureOfWork || undefined,
            subNatureOfWork: ticketData.subNatureOfWork || undefined,
            
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
            scheduledDate: parseExcelDateTime(ticketData.RequestedDate),
            
            // Import tracking
            uploadedViaExcel: true
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

export const getCustomerEngines = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    // Find DG details for the customer
    const dgDetails = await DGDetails.find({ customer: customerId })
      .select('engineSerialNumber dgModel dgRatingKVA dgMake dgSerialNumbers alternatorMake alternatorSerialNumber commissioningDate warrantyStatus cluster locationAddressId locationAddress')
      .lean();



    // Transform the data to match frontend expectations
    const engines = dgDetails.map(dg => ({
      engineSerialNumber: dg.engineSerialNumber,
      engineModel: dg.dgModel,
      kva: dg.dgRatingKVA,
      dgMake: dg.dgMake,
      dgSerialNumber: dg.dgSerialNumbers,
      alternatorMake: dg.alternatorMake,
      alternatorSerialNumber: dg.alternatorSerialNumber,
      commissioningDate: dg.commissioningDate,
      warrantyStatus: dg.warrantyStatus,
      cluster: dg.cluster,
      // Pass through stored address linkage (if present) so frontend can auto-select address
      locationAddressId: (dg as any).locationAddressId,
      locationAddress: (dg as any).locationAddress
    }));



    res.status(200).json({
      success: true,
      data: {
        engines,
        count: engines.length
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerAddresses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      throw new AppError('Customer ID is required', 400);
    }

    // Find customer with addresses
    const customer = await Customer.findById(customerId)
      .select('addresses name')
      .lean();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Transform addresses to match frontend expectations
    const addresses = customer.addresses.map((addr, index) => ({
      id: addr.id || index + 1,
      address: addr.address,
      state: addr.state,
      district: addr.district,
      pincode: addr.pincode,
      isPrimary: addr.isPrimary,
      gstNumber: addr.gstNumber,
      fullAddress: `${addr.address}, ${addr.district || ''}, ${addr.state || ''} - ${addr.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '')
    }));

    res.status(200).json({
      success: true,
      data: {
        addresses,
        count: addresses.length,
        customerName: customer.name
      }
    });
  } catch (error) {
    next(error);
  }
}; 

// @desc    Update Excel Service Ticket with extended fields
// @route   PUT /api/v1/services/:id/excel-update
// @access  Private
export const updateExcelServiceTicket = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ticket = await ServiceTicket.findById(req.params.id);
    if (!ticket) {
      return next(new AppError('Service ticket not found', 404));
    }

    // Extract Excel-specific fields
    const {
      ServiceRequestNumber,
      CustomerType,
      CustomerName,
      CustomerId,
      EngineSerialNumber,
      EngineModel,
      KVA,
      ServiceRequestDate,
      ServiceAttendedDate,
      HourMeterReading,
      TypeofService,
      SiteID,
      SREngineer,
      SREngineerId,
      ComplaintCode,
      ComplaintDescription,
      ResolutionDescription,
      eFSRNumber,
      eFSRClosureDateAndTime,
      ServiceRequestStatus,
      OEMName,
      // Additional fields that might be sent
      typeOfVisit,
      natureOfWork,
      subNatureOfWork
    } = req.body;

    // Prepare update data with Excel fields
    const updateData: any = {};


    // Excel-specific fields
    if (ServiceRequestNumber !== undefined) {
      updateData.ServiceRequestNumber = ServiceRequestNumber;
    }
    if (CustomerType !== undefined) {
      updateData.CustomerType = CustomerType;
    }
    if (CustomerName !== undefined) {
      updateData.CustomerName = CustomerName;
    }
    if (CustomerId !== undefined && CustomerId) {
      updateData.customer = CustomerId; // Set the customer objectId
    }
    if (EngineSerialNumber !== undefined) {
      updateData.EngineSerialNumber = EngineSerialNumber;
    }
    if (EngineModel !== undefined) {
      updateData.EngineModel = EngineModel;
    }
    if (KVA !== undefined) {
      updateData.KVA = KVA;
    }
    if (ServiceRequestDate !== undefined) {
      updateData.ServiceRequestDate = ServiceRequestDate;
    }
    if (ServiceAttendedDate !== undefined) {
      updateData.ServiceAttendedDate = ServiceAttendedDate;
    }
    if (HourMeterReading !== undefined) {
      updateData.HourMeterReading = HourMeterReading;
    }
    if (TypeofService !== undefined) {
      updateData.TypeofService = TypeofService;
    }
    if (SiteID !== undefined) {
      updateData.SiteID = SiteID;
    }
    if (OEMName !== undefined) {
      updateData.OemName = OEMName;
    }

    // Map engineer name/id
    if (SREngineerId !== undefined) {
      updateData.ServiceEngineerName = SREngineerId || undefined;
      updateData.assignedTo = SREngineerId || undefined;
    } else if (SREngineer !== undefined && typeof SREngineer === 'string' && SREngineer.trim() !== '') {
      updateData.ServiceEngineerName = undefined; // Keep as-is if not resolvable here
    }

    if (ComplaintCode !== undefined) {
      updateData.ComplaintCode = ComplaintCode;
    }
    if (ComplaintDescription !== undefined) {
      updateData.ComplaintDescription = ComplaintDescription;
      updateData.description = ComplaintDescription;
    }
    if (ResolutionDescription !== undefined) {
      updateData.ResolutionDescription = ResolutionDescription;
    }
    if (eFSRNumber !== undefined) {
      updateData.eFSRNumber = eFSRNumber;
    }
    if (eFSRClosureDateAndTime !== undefined) {
      updateData.eFSRClosureDateAndTime = eFSRClosureDateAndTime;
    }
    if (ServiceRequestStatus !== undefined) {
      updateData.ServiceRequestStatus = ServiceRequestStatus;
      updateData.serviceRequestStatus = ServiceRequestStatus;
    }
    
    if (typeOfVisit !== undefined) updateData.typeOfVisit = typeOfVisit;
    if (natureOfWork !== undefined) updateData.natureOfWork = natureOfWork;
    if (subNatureOfWork !== undefined) updateData.subNatureOfWork = subNatureOfWork;

    const updatedTicket = await ServiceTicket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    const response: APIResponse = {
      success: true,
      message: 'Excel Service ticket updated successfully',
      data: { ticket: updatedTicket }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Engineer payment report by month with ticket details and totals
// @route   GET /api/v1/services/reports/engineer-payments
// @access  Private
export const getEngineerPaymentReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { month, engineerId, customerId, status } = req.query as { month?: string; engineerId?: string; customerId?: string; status?: string };

    // Determine period: default to current month
    const now = new Date();
    const [y, m] = (month && /^\d{4}-\d{2}$/.test(month)) ? month.split('-').map(v => parseInt(v, 10)) : [now.getFullYear(), now.getMonth() + 1];
    const periodStart = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const periodEnd = new Date(y, m, 0, 23, 59, 59, 999); // end of month

    const match: any = {
      ServiceAttendedDate: { $gte: periodStart, $lte: periodEnd }
    };

    // Optional status filter; default consider resolved and closed
    if (status && typeof status === 'string' && status.trim() !== '') {
      match.ServiceRequestStatus = status;
    } else {
      match.ServiceRequestStatus = { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
    }

    if (engineerId && /^[0-9a-fA-F]{24}$/.test(engineerId)) {
      match.$or = [
        { ServiceEngineerName: new mongoose.Types.ObjectId(engineerId) },
        { assignedTo: new mongoose.Types.ObjectId(engineerId) }
      ];
    }

    if (customerId) {
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        match.customer = new mongoose.Types.ObjectId(customerId);
      } else {
        // When not ObjectId, allow CustomerName text filter
        match.CustomerName = { $regex: customerId, $options: 'i' };
      }
    }

    const rows = await ServiceTicket.aggregate([
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'ServiceEngineerName',
          foreignField: '_id',
          as: 'engineer'
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerDoc'
        }
      },
      {
        $addFields: {
          engineerObj: { $arrayElemAt: ['$engineer', 0] },
          customerObj: { $arrayElemAt: ['$customerDoc', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          ticketNumber: { $ifNull: ['$ServiceRequestNumber', ''] },
          serviceAttendedDate: '$ServiceAttendedDate',
          customerName: { $ifNull: ['$CustomerName', { $ifNull: ['$customerObj.name', ''] }] },
          typeOfVisit: { $ifNull: ['$typeOfVisit', ''] },
          natureOfWork: { $ifNull: ['$natureOfWork', ''] },
          subNatureOfWork: { $ifNull: ['$subNatureOfWork', ''] },
          serviceEngineerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$engineerObj.firstName', ''] },
                  ' ',
                  { $cond: [{ $in: ['$engineerObj.lastName', [null, '', 'Unknown']] }, '', { $ifNull: ['$engineerObj.lastName', ''] }] }
                ]
              }
            }
          },
          engineerId: { $ifNull: ['$ServiceEngineerName', '$assignedTo'] },
          convenienceCharges: { $ifNull: ['$serviceCharge', 0] }
        }
      },
      { $sort: { serviceEngineerName: 1, serviceAttendedDate: 1 } }
    ]);

    // Compute totals per engineer and grand total
    const totalsMap = new Map<string, { engineerId: string; engineerName: string; totalAmount: number }>();
    let grandTotal = 0;
    for (const r of rows) {
      const key = String(r.engineerId || r.serviceEngineerName || 'unassigned');
      const current = totalsMap.get(key) || { engineerId: key, engineerName: r.serviceEngineerName || 'Unassigned', totalAmount: 0 };
      current.totalAmount += Number(r.convenienceCharges || 0);
      totalsMap.set(key, current);
      grandTotal += Number(r.convenienceCharges || 0);
    }

    const totals = {
      byEngineer: Array.from(totalsMap.values()).sort((a, b) => a.engineerName.localeCompare(b.engineerName)),
      grandTotal
    };

    const response: APIResponse = {
      success: true,
      message: 'Engineer payment report generated successfully',
      data: {
        period: { month: `${y}-${String(m).padStart(2, '0')}`, start: periodStart, end: periodEnd },
        rows,
        totals
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get engineer work statistics by sub-nature of work
// @route   GET /api/v1/services/engineer-work-stats
// @access  Private
export const getEngineerWorkStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { engineerId, fromMonth, toMonth, month } = req.query;

    // Parse date range
    let startDate: Date;
    let endDate: Date;

    if (fromMonth && toMonth) {
      const [fromYear, fromMonthNum] = (fromMonth as string).split('-').map(Number);
      const [toYear, toMonthNum] = (toMonth as string).split('-').map(Number);

      startDate = new Date(fromYear, fromMonthNum - 1, 1);
      endDate = new Date(toYear, toMonthNum, 0, 23, 59, 59, 999);
    } else if (month) {
      const [year, monthNum] = (month as string).split('-').map(Number);
      startDate = new Date(year, monthNum - 1, 1);
      endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build match criteria
    const matchCriteria: any = {
      ServiceAttendedDate: {
        $gte: startDate,
        $lte: endDate
      },
      ServiceRequestStatus: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
    };

    if (engineerId) {
      matchCriteria.$or = [
        { ServiceEngineerName: engineerId },
        { assignedTo: engineerId }
      ];
    }

    // ─────────────────────────────────────────────
    //   MAIN ENGINEER STATS
    // ─────────────────────────────────────────────
    const workStats = await ServiceTicket.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'users',
          localField: 'ServiceEngineerName',
          foreignField: '_id',
          as: 'engineerObj'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedEngineerObj'
        }
      },
      {
        $addFields: {
          engineer: {
            $cond: {
              if: { $gt: [{ $size: '$engineerObj' }, 0] },
              then: { $arrayElemAt: ['$engineerObj', 0] },
              else: { $arrayElemAt: ['$assignedEngineerObj', 0] }
            }
          }
        }
      },
      {
        $match: { 'engineer.role': UserRole.FIELD_ENGINEER }
      },
      // First group: break down tickets by engineer + nature + subNature
      {
        $group: {
          _id: {
            engineerId: { $ifNull: ['$ServiceEngineerName', '$assignedTo'] },
            engineerName: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$engineer.firstName', ''] },
                    ' ',
                    {
                      $cond: [
                        { $in: ['$engineer.lastName', [null, '', 'Unknown']] },
                        '',
                        { $ifNull: ['$engineer.lastName', ''] }
                      ]
                    }
                  ]
                }
              }
            },
            natureOfWork: { $ifNull: ['$natureOfWork', 'unspecified'] },
            subNatureOfWork: { $ifNull: ['$subNatureOfWork', 'unspecified'] }
          },
          ticketCount: { $sum: 1 },
          totalConvenienceCharges: { $sum: { $ifNull: ['$serviceCharge', 0] } }
        }
      },
      // Second group: engineer-level grouping with nested subNature counts
      {
        $group: {
          _id: {
            engineerId: '$_id.engineerId',
            engineerName: '$_id.engineerName',
            natureOfWork: '$_id.natureOfWork'
          },
          subNatureBreakdown: {
            $push: {
              subNatureOfWork: '$_id.subNatureOfWork',
              ticketCount: '$ticketCount',
              totalConvenienceCharges: '$totalConvenienceCharges'
            }
          },
          totalTicketsInNature: { $sum: '$ticketCount' },
          totalChargesInNature: { $sum: '$totalConvenienceCharges' }
        }
      },
      // Final group: aggregate by engineer
      {
        $group: {
          _id: {
            engineerId: '$_id.engineerId',
            engineerName: '$_id.engineerName'
          },
          workBreakdown: {
            $push: {
              natureOfWork: '$_id.natureOfWork',
              totalTicketsInNature: '$totalTicketsInNature',
              totalChargesInNature: '$totalChargesInNature',
              // ✅ NEW: subNature ticket counts
              subNatureBreakdown: '$subNatureBreakdown'
            }
          },
          totalTickets: { $sum: '$totalTicketsInNature' },
          totalConvenienceCharges: { $sum: '$totalChargesInNature' }
        }
      },
      {
        $project: {
          _id: 0,
          engineerId: '$_id.engineerId',
          engineerName: '$_id.engineerName',
          workBreakdown: 1,
          totalTickets: 1,
          totalConvenienceCharges: 1
        }
      },
      { $sort: { engineerName: 1 } }
    ]);

    // ─────────────────────────────────────────────
    //   OVERALL STATS (unchanged)
    // ─────────────────────────────────────────────
    const overallStats = await ServiceTicket.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'users',
          localField: 'ServiceEngineerName',
          foreignField: '_id',
          as: 'engineerObj'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedEngineerObj'
        }
      },
      {
        $addFields: {
          engineer: {
            $cond: {
              if: { $gt: [{ $size: '$engineerObj' }, 0] },
              then: { $arrayElemAt: ['$engineerObj', 0] },
              else: { $arrayElemAt: ['$assignedEngineerObj', 0] }
            }
          }
        }
      },
      { $match: { 'engineer.role': UserRole.FIELD_ENGINEER } },
      {
        $group: {
          _id: {
            natureOfWork: { $ifNull: ['$natureOfWork', 'unspecified'] },
            subNatureOfWork: { $ifNull: ['$subNatureOfWork', 'unspecified'] }
          },
          ticketCount: { $sum: 1 },
          totalConvenienceCharges: { $sum: { $ifNull: ['$serviceCharge', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          natureOfWork: '$_id.natureOfWork',
          subNatureOfWork: '$_id.subNatureOfWork',
          ticketCount: 1,
          totalConvenienceCharges: 1
        }
      },
      { $sort: { natureOfWork: 1, subNatureOfWork: 1 } }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Engineer work statistics retrieved successfully',
      data: {
        period: {
          start: startDate,
          end: endDate,
          fromMonth: fromMonth || null,
          toMonth: toMonth || null,
          month: month || null
        },
        engineerStats: workStats,
        overallStats,
        summary: {
          totalEngineers: workStats.length,
          totalTickets: workStats.reduce((sum, eng) => sum + eng.totalTickets, 0),
          totalConvenienceCharges: workStats.reduce((sum, eng) => sum + eng.totalConvenienceCharges, 0)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};


  