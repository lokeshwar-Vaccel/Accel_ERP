import { Request, Response, NextFunction } from 'express';
import { Customer } from '../models/Customer';
import { DGCustomer } from '../models/DGCustomer';
import { OEM } from '../models/OEM';
import { DGDetails } from '../models/DGDetails';

import { AuthenticatedRequest, APIResponse, LeadStatus, CustomerType, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import notificationService from '../services/notificationService';
import { TransactionCounter } from '../models/TransactionCounter';

// Utility to get next customerId
async function getNextCustomerId() {
  // Use a single counter document for customerId
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'customerId' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `SPS1${String(counter.sequence).padStart(4, '0')}`;
}

// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private
export const getCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'name', 
      search, 
      customerType, 
      status, 
      assignedTo,
      leadSource,
      newLeadStatus,
      qualifiedStatus,
      convertedStatus,
      lostStatus,
      contactedStatus,
      dateFrom,
      dateTo,
      type
    } = req.query as QueryParams & {
      customerType?: CustomerType;
      status?: LeadStatus;
      assignedTo?: string;
      leadSource?: string;
      newLeadStatus?: string;
      qualifiedStatus?: string;
      convertedStatus?: string;
      lostStatus?: string;
      contactedStatus?: string;
      dateFrom?: string;
      dateTo?: string;
      type?: string;
    };
    console.log('Full req.query:', req.query);
    console.log('All query keys:', Object.keys(req.query));

    

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (customerType) {
      query.customerType = customerType;
    }
    
    // Handle status-based filters
    if (newLeadStatus === 'true') {
      query.status = 'new';
    } else if (qualifiedStatus === 'true') {
      query.status = 'qualified';
    } else if (convertedStatus === 'true') {
      query.status = 'converted';
    } else if (lostStatus === 'true') {
      query.status = 'lost';
    } else if (contactedStatus === 'true') {
      query.status = 'contacted';
    } else if (status) {
      // If no specific status filter is applied, use the general status filter
      query.status = status;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (leadSource) {
      query.leadSource = { $regex: leadSource, $options: 'i' };
    }
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (type) {
      query.type = type;
    }
    console.log('MongoDB query object:', query);

    // Execute query with pagination
    let customers = await Customer.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('dgDetails')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Ensure 'type' is set to 'customer' if missing
    customers = customers.map((customer: any) => {
      if (!customer.type) {
        customer.type = 'customer';
      }
      return customer;
    });
    console.log('Number of customers returned:', customers.length);

    const total = await Customer.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));
    const totalAllCustomers = await Customer.countDocuments({});

    // Calculate counts for different statuses
    const [totalCustomers, newLeads, qualified, converted, lost, contacted] = await Promise.all([
      Customer.countDocuments({ ...query }),
      Customer.countDocuments({ ...query, status: 'new' }),
      Customer.countDocuments({ ...query, status: 'qualified' }),
      Customer.countDocuments({ ...query, status: 'converted' }),
      Customer.countDocuments({ ...query, status: 'lost' }),
      Customer.countDocuments({ ...query, status: 'contacted' })
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Customers retrieved successfully',
      data: {
        customers,
        counts: {
          totalCustomers,
          newLeads,
          qualified,
          converted,
          lost,
          contacted
        },
        newLeadStatusCount: newLeads,
        qualifiedStatusCount: qualified,
        convertedStatusCount: converted,
        lostStatusCount: lost,
        contactedStatusCount: contacted,
        totalCustomersCount: totalAllCustomers
      },
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

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private
export const getCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('contactHistory.createdBy', 'firstName lastName email')
      .populate('dgDetails');

    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Customer retrieved successfully',
      data: { customer }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/v1/customers
// @access  Private
export const createCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for duplicate GST number in addresses if provided - only within the same type (customer or supplier)
    if (Array.isArray(req.body.addresses)) {
      for (const address of req.body.addresses) {
        if (address.gstNumber && address.gstNumber.trim()) {
          const existingCustomer = await Customer.findOne({
            'addresses.gstNumber': address.gstNumber.trim(),
            type: req.body.type,
          });
          if (existingCustomer) {
            return next(new AppError(`GST Number ${address.gstNumber} already exists for this ${req.body.type}. Please use a different GST Number.`, 400));
          }
        }
      }
    }

    // Generate customerId only for customers (not suppliers)
    let customerData = {
      ...req.body,
      createdBy: req.user?.id
    };

    // Remove dgDetails from customerData to avoid validation issues
    delete customerData.dgDetails;

    if (req.body.type === 'customer') {
      const customerId = await getNextCustomerId();
      customerData.customerId = customerId;
    }

    const customer = await Customer.create(customerData);

    // Create DGDetails if provided
    let dgDetails = null;
    if (req.body.dgDetails && Array.isArray(req.body.dgDetails)) {
      console.log('Creating DGDetails for customer:', customer._id);
      console.log('DGDetails data:', req.body.dgDetails);
      try {
        const dgDetailsArray = [];
        for (const dgData of req.body.dgDetails) {
          console.log('Creating DGDetail with data:', dgData);
          const dgDetail = new DGDetails({
            ...dgData,
            customer: customer._id,
            createdBy: req.user?.id
          });
          console.log('DGDetail object created:', dgDetail);
          const savedDGDetail = await dgDetail.save();
          console.log('DGDetail saved successfully:', savedDGDetail._id);
          dgDetailsArray.push(savedDGDetail);
        }

        // Update Customer's dgDetails array with the new DGDetails IDs
        console.log('Updating customer with DGDetails IDs:', dgDetailsArray.map(dg => dg._id));
        await Customer.findByIdAndUpdate(
          customer._id,
          { $push: { dgDetails: { $each: dgDetailsArray.map(dg => dg._id) } } }
        );
        
        dgDetails = dgDetailsArray;
        console.log('Successfully created and linked DGDetails');
      } catch (dgError) {
        console.error('Error creating DGDetails:', dgError);
        // Don't fail the main request if DGDetails creation fails
        // You might want to handle this differently based on your requirements
      }
    }

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('dgDetails');

    // Create assignment notification if customer is assigned to someone
    try {
      if (customer.assignedTo) {
        await notificationService.createAssignmentNotification(
          customer.assignedTo.toString(),
          (customer as any)._id.toString(),
          customer.name
        );
      }
    } catch (notificationError) {
      console.error('Error creating assignment notification:', notificationError);
      // Don't fail the main request if notifications fail
    }

    const response: APIResponse = {
      success: true,
      message: 'Customer created successfully',
      data: { 
        customer: populatedCustomer,
        dgDetails: dgDetails 
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private
export const updateCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('Update customer request received for ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('DGDetails in request:', req.body.dgDetails);
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
    // Check for duplicate GST number in addresses if provided - only within the same type (customer or supplier)
    if (Array.isArray(req.body.addresses)) {
      for (const address of req.body.addresses) {
        if (address.gstNumber && address.gstNumber.trim()) {
          const existingCustomer = await Customer.findOne({
            'addresses.gstNumber': address.gstNumber.trim(),
            type: req.body.type || customer.type,
            _id: { $ne: req.params.id }
          });
          if (existingCustomer) {
            return next(new AppError(`GST Number ${address.gstNumber} already exists for this ${req.body.type || customer.type}. Please use a different GST Number.`, 400));
          }
        }
      }
    }

    // Store old values for notification comparison
    const oldAssignedTo = customer.assignedTo;
    const oldStatus = customer.status;

    // Create update data without dgDetails to avoid validation issues
    const updateData = { ...req.body };
    delete updateData.dgDetails;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('dgDetails');

    // Handle DGDetails update if provided
    if (req.body.dgDetails) {
      try {
        console.log('Updating DGDetails for customer:', req.params.id);
        console.log('New DGDetails data:', req.body.dgDetails);
        
        // First, delete all existing DGDetails for this customer
        await DGDetails.deleteMany({ customer: req.params.id });
        console.log('Deleted existing DGDetails');
        
        // Clear the customer's dgDetails array
        await Customer.findByIdAndUpdate(
          req.params.id,
          { $set: { dgDetails: [] } }
        );
        console.log('Cleared customer dgDetails array');
        
        // Create new DGDetails if provided
        if (Array.isArray(req.body.dgDetails) && req.body.dgDetails.length > 0) {
          const newDGDetailsIds = [];
          
          for (const dgData of req.body.dgDetails) {
            console.log('Creating new DGDetail:', dgData);
            const newDGDetails = new DGDetails({
              ...dgData,
              customer: req.params.id,
              createdBy: req.user?.id
            });
            
            const savedDGDetails = await newDGDetails.save();
            newDGDetailsIds.push(savedDGDetails._id);
            console.log('Created DGDetail with ID:', savedDGDetails._id);
          }
          
          // Update customer's dgDetails array with new IDs
          await Customer.findByIdAndUpdate(
            req.params.id,
            { $set: { dgDetails: newDGDetailsIds } }
          );
          console.log('Updated customer with new DGDetails IDs:', newDGDetailsIds);
        }
        
        console.log('Successfully updated DGDetails');
      } catch (dgError) {
        console.error('Error updating DGDetails:', dgError);
        // Don't fail the main request if DGDetails update fails
      }
    }

    // Create notifications for changes
    try {
      // Notification for assignment change
      if (req.body.assignedTo && req.body.assignedTo !== oldAssignedTo?.toString()) {
        await notificationService.createAssignmentNotification(
          req.body.assignedTo,
          (customer as any)._id.toString(),
          customer.name
        );
      }

      // Notification for status change
      if (req.body.status && req.body.status !== oldStatus) {
        const assignedUserId = req.body.assignedTo || oldAssignedTo?.toString();
        if (assignedUserId) {
          await notificationService.createStatusChangeNotification(
            assignedUserId,
            (customer as any)._id.toString(),
            customer.name,
            oldStatus,
            req.body.status
          );
        }
      }
    } catch (notificationError) {
      console.error('Error creating notifications:', notificationError);
      // Don't fail the main request if notifications fail
    }

    // Get the final updated customer with populated DGDetails
    const finalCustomer = await Customer.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('dgDetails');

    console.log('Final customer with populated DGDetails:', finalCustomer);
    console.log('DGDetails in final customer:', finalCustomer?.dgDetails);

    const response: APIResponse = {
      success: true,
      message: 'Customer updated successfully',
      data: { customer: finalCustomer }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private
export const deleteCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Delete associated DGDetails first
    if (customer.dgDetails && customer.dgDetails.length > 0) {
      await DGDetails.deleteMany({ _id: { $in: customer.dgDetails } });
    }

    await Customer.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Customer deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Add contact history
// @route   POST /api/v1/customers/:id/contact-history
// @access  Private
export const addContactHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const contactData = {
      ...req.body,
      createdBy: req.user!.id
    };

    customer.contactHistory.push(contactData);
    await customer.save();

    const populatedCustomer = await Customer.findById(customer._id)
      .populate('contactHistory.createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Contact history added successfully',
      data: { 
        customer: populatedCustomer,
        newContact: contactData
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact history
// @route   PUT /api/v1/customers/:id/contact-history/:contactId
// @access  Private
export const updateContactHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const contact = (customer.contactHistory as any).id(req.params.contactId);
    if (!contact) {
      return next(new AppError('Contact history not found', 404));
    }

    Object.assign(contact, req.body);
    await customer.save();

    const response: APIResponse = {
      success: true,
      message: 'Contact history updated successfully',
      data: { contact }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact history
// @route   DELETE /api/v1/customers/:id/contact-history/:contactId
// @access  Private
export const deleteContactHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const contact = (customer.contactHistory as any).id(req.params.contactId);
    if (!contact) {
      return next(new AppError('Contact history not found', 404));
    }

    (customer.contactHistory as any).pull(req.params.contactId);
    await customer.save();

    const response: APIResponse = {
      success: true,
      message: 'Contact history deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Convert lead to customer
// @route   PUT /api/v1/customers/:id/convert
// @access  Private
export const convertLead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, conversionNotes, assignedTo } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    customer.status = status;
    if (conversionNotes) {
      customer.notes = conversionNotes;
    }
    if (assignedTo) {
      customer.assignedTo = assignedTo;
    }

    await customer.save();

    const response: APIResponse = {
      success: true,
      message: 'Lead converted successfully',
      data: { customer }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule follow-up
// @route   POST /api/v1/customers/:id/follow-up
// @access  Private
export const scheduleFollowUp = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { followUpDate, followUpType, notes, assignedTo } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    const followUpData = {
      type: followUpType,
      date: new Date(),
      notes: notes || `Follow-up scheduled for ${new Date(followUpDate).toLocaleDateString()}`,
      followUpDate: new Date(followUpDate),
      createdBy: req.user!.id
    };

    customer.contactHistory.push(followUpData);
    if (assignedTo) {
      customer.assignedTo = assignedTo;
    }
    
    await customer.save();

    const response: APIResponse = {
      success: true,
      message: 'Follow-up scheduled successfully',
      data: { 
        customer,
        followUp: followUpData
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all OEM customers
// @route   GET /api/v1/customers/oem
// @access  Private
export const getOEMCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'companyName', 
      search, 
      status, 
      rating
    } = req.query as any;

    // Build query for OEM customers
    const query: any = {};
    
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { oemCode: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (rating) {
      query.rating = { $gte: parseInt(rating as string) };
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj: any = {};
    if (sort === 'companyName') sortObj.companyName = 1;
    else if (sort === '-companyName') sortObj.companyName = -1;
    else if (sort === 'createdAt') sortObj.createdAt = 1;
    else if (sort === '-createdAt') sortObj.createdAt = -1;
    else if (sort === 'status') sortObj.status = 1;
    else if (sort === '-status') sortObj.status = -1;
    else if (sort === 'rating') sortObj.rating = -1;
    else if (sort === '-rating') sortObj.rating = 1;
    else sortObj.createdAt = -1; // Default sort

    // Execute query from OEM table
    const [oems, total] = await Promise.all([
      OEM.find(query)
        .populate('createdBy', 'firstName lastName email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OEM.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: APIResponse = {
      success: true,
      message: 'OEM customers retrieved successfully',
      data: oems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all DG customers
// @route   GET /api/v1/customers/dg-sales
// @access  Private
export const getDGCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'name', 
      search, 
      customerType, 
      status, 
      assignedTo,
      leadSource,
      segment,
      kva
    } = req.query as any;

    // Build query for DG customers
    const query: any = { isDGSalesCustomer: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { corporateName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (customerType) {
      query.customerType = customerType;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (leadSource) {
      query.leadSource = leadSource;
    }

    if (segment) {
      query['dgRequirements.segment'] = segment;
    }

    if (kva) {
      query['dgRequirements.kva'] = { $regex: kva, $options: 'i' };
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj: any = {};
    if (sort === 'name') sortObj.name = 1;
    else if (sort === '-name') sortObj.name = -1;
    else if (sort === 'createdAt') sortObj.createdAt = 1;
    else if (sort === '-createdAt') sortObj.createdAt = -1;
    else if (sort === 'status') sortObj.status = 1;
    else if (sort === '-status') sortObj.status = -1;
    else sortObj.createdAt = -1; // Default sort

    // Execute query
    const [customers, total] = await Promise.all([
      DGCustomer.find(query)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DGCustomer.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: APIResponse = {
      success: true,
      message: 'DG customers retrieved successfully',
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all converted customers
// @route   GET /api/v1/customers/converted
// @access  Private
export const getConvertedCustomers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'name', 
      search, 
      customerType, 
      assignedTo,
      leadSource,
      dateFrom,
      dateTo
    } = req.query as any;

    // Build query for converted customers
    const query: any = { status: 'converted' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (customerType) {
      query.customerType = customerType;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    
    if (leadSource) {
      query.leadSource = leadSource;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sortObj: any = {};
    if (sort === 'name') sortObj.name = 1;
    else if (sort === '-name') sortObj.name = -1;
    else if (sort === 'createdAt') sortObj.createdAt = 1;
    else if (sort === '-createdAt') sortObj.createdAt = -1;
    else if (sort === 'status') sortObj.status = 1;
    else if (sort === '-status') sortObj.status = -1;
    else sortObj.createdAt = -1; // Default sort

    // Execute query
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Customer.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    const response: APIResponse = {
      success: true,
      message: 'Converted customers retrieved successfully',
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};