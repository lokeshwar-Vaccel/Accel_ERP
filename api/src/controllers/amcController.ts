import { Response, NextFunction } from 'express';
import { AMC } from '../models/AMC';
import { Customer } from '../models/Customer';
import { DGDetails } from '../models/DGDetails';
import { AuthenticatedRequest, APIResponse, AMCStatus, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import * as XLSX from 'xlsx';

// Utility function to generate unique contract numbers
const generateUniqueContractNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `AMC-${currentYear}-`;
  
  // Find the highest existing contract number for this year
  const existingContracts = await AMC.find({
    contractNumber: { $regex: `^${yearPrefix}` }
  }).sort({ contractNumber: -1 }).limit(1);
  
  let nextSequence = 1;
  if (existingContracts.length > 0) {
    const lastContractNumber = existingContracts[0].contractNumber;
    const lastSequence = parseInt(lastContractNumber.split('-')[2]);
    if (!isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }
  
  // Try up to 10 times to find a unique contract number
  for (let attempt = 0; attempt < 10; attempt++) {
    const contractNumber = `${yearPrefix}${String(nextSequence).padStart(4, '0')}`;
    
    // Check if this contract number already exists
    const existingContract = await AMC.findOne({ contractNumber });
    if (!existingContract) {
      return contractNumber;
    }
    
    // If collision detected, try the next sequence number
    console.warn(`Contract number collision detected: ${contractNumber}, trying next sequence (attempt ${attempt + 1})`);
    nextSequence++;
  }
  
  // If we've tried 10 times and still can't find a unique number, throw an error
  throw new Error(`Failed to generate unique contract number after 10 attempts. Last attempted: ${yearPrefix}${String(nextSequence).padStart(4, '0')}`);
};

// @desc    Get all AMC contracts
// @route   GET /api/v1/amc
// @access  Private
export const getAMCContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('getAMCContracts called with query:', req.query);
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      status,
      customer,
      dateFrom,
      dateTo,
      expiringIn
    } = req.query as QueryParams & {
      status?: AMCStatus;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      expiringIn?: string;
    };

    // Build query
    const query: any = {};

    if (search) {
      console.log('Building search query for term:', search);
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { terms: { $regex: search, $options: 'i' } },
        { engineSerialNumber: { $regex: search, $options: 'i' } }
      ];
      
      // Add customer name and DG details search
      try {
        console.log('Searching customers with name pattern:', search);
        
        // Search customers by name, email, phone, customerId
        const matchingCustomers = await Customer.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { customerId: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        
        // Search customers by DG details (engine serial number, DG serial number, etc.)
        const matchingDGDetails = await DGDetails.find({
          $or: [
            { engineSerialNumber: { $regex: search, $options: 'i' } },
            { dgSerialNumbers: { $regex: search, $options: 'i' } },
            { alternatorSerialNumber: { $regex: search, $options: 'i' } },
            { dgMake: { $regex: search, $options: 'i' } },
            { dgModel: { $regex: search, $options: 'i' } }
          ]
        }).select('customer').lean();
        
        const customerIdsFromDG = matchingDGDetails.map(dg => dg.customer);
        
        // Combine all customer IDs
        const allCustomerIds = [
          ...matchingCustomers.map((c: any) => c._id),
          ...customerIdsFromDG
        ];
        
        console.log('Found matching customers:', matchingCustomers.length);
        console.log('Found matching DG details:', matchingDGDetails.length);
        
        if (allCustomerIds.length > 0) {
          // Remove duplicates
          const uniqueCustomerIds = [...new Set(allCustomerIds.map(id => id.toString()))];
          query.$or.push({ customer: { $in: uniqueCustomerIds } });
          console.log('Added customer IDs to search query:', uniqueCustomerIds);
        }
      } catch (error) {
        console.error('Error searching customers:', error);
        // Continue with other search criteria if customer search fails
      }
    }

    if (status) {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Handle expiring contracts filter
    if (expiringIn) {
      const days = parseInt(expiringIn);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      query.endDate = { $lte: expiryDate };
      query.status = AMCStatus.ACTIVE;
    }

    // Execute query with pagination
    console.log('Executing AMC query:', JSON.stringify(query, null, 2));
    
    const contracts = await AMC.find(query)
      .select('contractNumber customer customerAddress contactPersonName contactNumber engineSerialNumber engineModel kva dgMake dateOfCommissioning amcStartDate amcEndDate amcType numberOfVisits numberOfOilServices products startDate endDate contractValue scheduledVisits completedVisits status nextVisitDate visitSchedule terms createdBy createdAt updatedAt')
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Get total count for pagination
    const total = await AMC.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    console.log(`Query completed. Found ${contracts.length} contracts out of ${total} total`);

    const response: APIResponse = {
      success: true,
      message: 'AMC contracts retrieved successfully',
      data: { contracts },
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

// @desc    Get single AMC contract
// @route   GET /api/v1/amc/:id
// @access  Private
export const getAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id)
      .select('contractNumber customer customerAddress contactPersonName contactNumber engineSerialNumber engineModel kva dgMake dateOfCommissioning amcStartDate amcEndDate amcType numberOfVisits numberOfOilServices products startDate endDate contractValue scheduledVisits completedVisits status nextVisitDate visitSchedule terms createdBy createdAt updatedAt')
      .populate('customer', 'name email phone address customerType')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email phone');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC contract retrieved successfully',
      data: { contract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new AMC contract
// @route   POST /api/v1/amc
// @access  Private
export const createAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[AMC] createAMCContract start');
    console.log('[AMC] engineSerialNumber:', req.body?.engineSerialNumber || 'N/A');

    // Simple uniqueness check for engineSerialNumber
    if (!req.body.engineSerialNumber || String(req.body.engineSerialNumber).trim() === '') {
      return next(new AppError('Engine serial number is required', 400));
    }

    // Block if ANY AMC exists for this engineSerialNumber (regardless of status)
    const duplicateQuery = { engineSerialNumber: req.body.engineSerialNumber } as const;
    console.log('[AMC] duplicate check query:', JSON.stringify(duplicateQuery));

    const existingForEngine = await AMC.findOne(duplicateQuery).select('_id contractNumber status');
    console.log('[AMC] duplicate found:', !!existingForEngine);

    if (existingForEngine) {
      return next(new AppError('An AMC already exists for this engine serial number', 400));
    }

    // Generate unique contract number
    let contractNumber: string;
    try {
      contractNumber = await generateUniqueContractNumber();
      console.log(`Generated contract number: ${contractNumber}`);
    } catch (error) {
      console.error('Error generating contract number:', error);
      return next(new AppError('Failed to generate unique contract number. Please try again.', 500));
    }

    // Calculate next visit date (30 days from start)
    const nextVisitDate = new Date(req.body.amcStartDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 1);

    // Map new fields to legacy fields for backward compatibility
    const contractData = {
      ...req.body,
      contractNumber,
      nextVisitDate,
      completedVisits: 0,
      createdBy: req.user!.id,
      // Map new fields to legacy fields
      startDate: req.body.amcStartDate,
      endDate: req.body.amcEndDate,
      scheduledVisits: req.body.numberOfVisits,
      // Set default contract value if not provided
      contractValue: req.body.contractValue || 0,
      // Set default products array if not provided
      products: req.body.products || []
    };

    const contract = await AMC.create(contractData);

    const populatedContract = await AMC.findById(contract._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract created successfully',
      data: { contract: populatedContract }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract
// @route   PUT /api/v1/amc/:id
// @access  Private
export const updateAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const updatedContract = await AMC.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract updated successfully',
      data: { contract: updatedContract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule AMC visit
// @route   POST /api/v1/amc/:id/schedule-visit
// @access  Private
export const scheduleAMCVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { scheduledDate, assignedTo, visitType, estimatedDuration, notes } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Check if we're exceeding the scheduled visits limit
    if (contract.visitSchedule.length >= contract.numberOfVisits) {
      return next(new AppError(`Cannot schedule more visits. Maximum allowed: ${contract.numberOfVisits}`, 400));
    }

    const visitData = {
      scheduledDate: new Date(scheduledDate),
      assignedTo,
      status: 'pending' as const,
      notes
    };

    contract.visitSchedule.push(visitData);

    // Update next visit date
    const nextVisit = new Date(scheduledDate);
    nextVisit.setDate(nextVisit.getDate() + 30); // Next visit in 30 days
    contract.nextVisitDate = nextVisit;

    await contract.save();

    const populatedContract = await AMC.findById(contract._id)
      .populate('visitSchedule.assignedTo', 'firstName lastName email phone');

    const response: APIResponse = {
      success: true,
      message: 'AMC visit scheduled successfully',
      data: {
        contract: populatedContract,
        newVisit: visitData
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Complete AMC visit
// @route   PUT /api/v1/amc/:id/visits/:visitId
// @access  Private
export const completeAMCVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { completedDate, serviceReport, issues, customerSignature, nextVisitRecommendations, visitIndex } = req.body;
    const amcId = req.params.id;

    console.log('Completing visit for AMC:', amcId);

    // Find the AMC contract by ID
    const contract = await AMC.findById(amcId);

    if (!contract) {
      console.log('AMC contract not found:', amcId);
      return next(new AppError('AMC contract not found', 404));
    }

    console.log('Found contract with', contract.visitSchedule.length, 'visits');

    // Find the visit by index
    if (visitIndex === undefined || visitIndex < 0 || visitIndex >= contract.visitSchedule.length) {
      console.log('Invalid visit index:', visitIndex);
      return next(new AppError('Invalid visit index', 400));
    }

    const visit = contract.visitSchedule[visitIndex];
    console.log('Found visit at index:', visitIndex, 'Status:', visit.status);

    if (visit.status === 'completed') {
      return next(new AppError('Visit is already completed', 400));
    }



    // Update visit with completion data
    (visit as any).completedDate = new Date(completedDate);
    (visit as any).status = 'completed';
    (visit as any).serviceReport = serviceReport;
    (visit as any).issues = issues || [];
    (visit as any).nextVisitRecommendations = nextVisitRecommendations;
    
    // Only set customerSignature if provided
    if (customerSignature && customerSignature.trim() !== '') {
      (visit as any).customerSignature = customerSignature;
    }

    // Increment completed visits count
    contract.completedVisits += 1;

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC visit completed successfully',
      data: {
        contract,
        completedVisit: visit
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Renew AMC contract
// @route   POST /api/v1/amc/:id/renew
// @access  Private
export const renewAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      newStartDate,
      newEndDate,
      newContractValue,
      newScheduledVisits,
      priceAdjustment,
      updatedTerms,
      addProducts,
      removeProducts
    } = req.body;

    const contract = await AMC.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Apply price adjustment if specified
    let finalContractValue = newContractValue;
    if (priceAdjustment) {
      if (priceAdjustment.type === 'percentage') {
        finalContractValue = contract.contractValue * (1 + priceAdjustment.value / 100);
      } else if (priceAdjustment.type === 'fixed') {
        finalContractValue = contract.contractValue + priceAdjustment.value;
      }
    }

    // Calculate next visit date (30 days from start)
    const nextVisitDate = new Date(newStartDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 30);

    // Update existing contract with new details
    contract.startDate = new Date(newStartDate);
    contract.endDate = new Date(newEndDate);
    contract.contractValue = finalContractValue;
    contract.scheduledVisits = newScheduledVisits;
    contract.status = AMCStatus.ACTIVE;
    contract.terms = updatedTerms || contract.terms;
    contract.nextVisitDate = nextVisitDate;
    contract.completedVisits = 0; // Reset completed visits

    // Update products if specified
    if (addProducts && addProducts.length > 0) {
      contract.products = [...contract.products, ...addProducts];
    }
    if (removeProducts && removeProducts.length > 0) {
      contract.products = contract.products.filter(product =>
        !removeProducts.includes(product.toString())
      );
    }

    await contract.save();

    // Populate the updated contract for response
    const populatedContract = await AMC.findById(contract._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC contract renewed successfully',
      data: {
        contract: populatedContract,
        priceAdjustment: priceAdjustment ? {
          type: priceAdjustment.type,
          value: priceAdjustment.value,
          reason: priceAdjustment.reason
        } : null
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get expiring contracts
// @route   GET /api/v1/amc/expiring
// @access  Private
export const getExpiringContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const expiringContracts = await AMC.find({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category')
      .sort({ endDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts expiring in ${days} days retrieved successfully`,
      data: {
        contracts: expiringContracts,
        count: expiringContracts.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC statistics
// @route   GET /api/v1/amc/stats
// @access  Private
export const getAMCStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const totalContracts = await AMC.countDocuments();
    const activeContracts = await AMC.countDocuments({ status: AMCStatus.ACTIVE });
    const expiredContracts = await AMC.countDocuments({ status: AMCStatus.EXPIRED });
    const cancelledContracts = await AMC.countDocuments({ status: AMCStatus.CANCELLED });

    // Contracts expiring in next 30 days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const expiringContracts = await AMC.countDocuments({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    });

    // Total contract value
    const contractValueStats = await AMC.aggregate([
      { $match: { status: AMCStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$contractValue' },
          avgValue: { $avg: '$contractValue' }
        }
      }
    ]);

    // Visit completion rate
    const visitStats = await AMC.aggregate([
      { $match: { status: AMCStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          totalScheduled: { $sum: '$scheduledVisits' },
          totalCompleted: { $sum: '$completedVisits' }
        }
      }
    ]);

    const visitCompletionRate = visitStats[0] ?
      (visitStats[0].totalCompleted / visitStats[0].totalScheduled * 100) : 0;

    const response: APIResponse = {
      success: true,
      message: 'AMC statistics retrieved successfully',
      data: {
        totalContracts,
        activeContracts,
        expiredContracts,
        cancelledContracts,
        expiringContracts,
        totalContractValue: contractValueStats[0]?.totalValue || 0,
        avgContractValue: contractValueStats[0]?.avgValue || 0,
        visitCompletionRate: Math.round(visitCompletionRate)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AMC reports
// @route   GET /api/v1/amc/reports/:type
// @access  Private
export const generateAMCReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type } = req.params;
    const { dateFrom, dateTo, customer, status, format = 'json' } = req.query as {
      dateFrom?: string;
      dateTo?: string;
      customer?: string;
      status?: AMCStatus;
      format?: 'json' | 'csv' | 'pdf';
    };

    const query: any = {};

    // Build query based on new AMC structure
    if (dateFrom || dateTo) {
      query.$or = [];
      if (dateFrom || dateTo) {
        const dateQuery: any = {};
        if (dateFrom) dateQuery.$gte = new Date(dateFrom);
        if (dateTo) dateQuery.$lte = new Date(dateTo);
        query.$or.push({ createdAt: dateQuery });
        query.$or.push({ amcStartDate: dateQuery });
        query.$or.push({ amcEndDate: dateQuery });
      }
    }

    if (customer) {
      query.customer = customer;
    }

    if (status) {
      query.status = status;
    }

    // If no date filters, remove $or
    if (query.$or && query.$or.length === 0) {
      delete query.$or;
    }

    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType addresses')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .lean();

    // Calculate virtual fields manually since .lean() doesn't include them
    const contractsWithVirtuals = contracts.map(contract => {
      // Calculate days until expiry
      let daysUntilExpiry = null;
      if (contract.amcEndDate) {
        const now = new Date();
        const endDate = new Date(contract.amcEndDate);
        const diff = endDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      // Calculate completion percentage
      let completionPercentage = 0;
      if (contract.numberOfVisits && contract.numberOfVisits > 0) {
        completionPercentage = Math.round(((contract.completedVisits || 0) / contract.numberOfVisits) * 100);
      }

      return {
        ...contract,
        daysUntilExpiry,
        completionPercentage
      };
    });

    let reportData: any = {};

    switch (type) {
      case 'contract_summary':
        const totalValue = contractsWithVirtuals.reduce((sum, c) => sum + (c.contractValue || 0), 0);
        const activeContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.ACTIVE);
        const expiredContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.EXPIRED);
        const pendingContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.PENDING);
        const draftContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.DRAFT);
        const cancelledContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.CANCELLED);
        const suspendedContracts = contractsWithVirtuals.filter(c => c.status === AMCStatus.SUSPENDED);

        reportData = {
          totalContracts: contractsWithVirtuals.length,
          activeContracts: activeContracts.length,
          expiredContracts: expiredContracts.length,
          pendingContracts: pendingContracts.length,
          draftContracts: draftContracts.length,
          cancelledContracts: cancelledContracts.length,
          suspendedContracts: suspendedContracts.length,
          totalValue,
          averageContractValue: contractsWithVirtuals.length > 0 ? totalValue / contractsWithVirtuals.length : 0,
          contractsByStatus: {
            active: activeContracts.length,
            expired: expiredContracts.length,
            pending: pendingContracts.length,
            draft: draftContracts.length,
            cancelled: cancelledContracts.length,
            suspended: suspendedContracts.length
          },
          contractsByType: contractsWithVirtuals.reduce((acc, c) => {
            acc[c.amcType || 'AMC'] = (acc[c.amcType || 'AMC'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          totalVisits: contractsWithVirtuals.reduce((sum, c) => sum + (c.numberOfVisits || 0), 0),
          totalOilServices: contractsWithVirtuals.reduce((sum, c) => sum + (c.numberOfOilServices || 0), 0),
          contracts: contractsWithVirtuals.slice(0, 50).map(c => ({
            contractNumber: c.contractNumber,
            customer: c.customer ? {
              name: (c.customer as any).name,
              email: (c.customer as any).email,
              phone: (c.customer as any).phone,
              customerType: (c.customer as any).customerType
            } : null,
            engineSerialNumber: c.engineSerialNumber,
            engineModel: c.engineModel,
            kva: c.kva,
            dgMake: c.dgMake,
            amcType: c.amcType,
            numberOfVisits: c.numberOfVisits,
            numberOfOilServices: c.numberOfOilServices,
            amcStartDate: c.amcStartDate,
            amcEndDate: c.amcEndDate,
            contractValue: c.contractValue || 0,
            status: c.status,
            daysUntilExpiry: c.daysUntilExpiry,
            completionPercentage: c.completionPercentage,
            createdBy: c.createdBy ? {
              name: `${(c.createdBy as any).firstName} ${(c.createdBy as any).lastName}`,
              email: (c.createdBy as any).email
            } : null,
            createdAt: c.createdAt
          }))
        };
        break;

      case 'revenue_analysis':
        const monthlyRevenue = contractsWithVirtuals.reduce((acc, c) => {
          const month = new Date(c.createdAt).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + (c.contractValue || 0);
          return acc;
        }, {} as Record<string, number>);

        const revenueByStatus = contractsWithVirtuals.reduce((acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + (c.contractValue || 0);
          return acc;
        }, {} as Record<string, number>);

        const revenueByType = contractsWithVirtuals.reduce((acc, c) => {
          acc[c.amcType || 'AMC'] = (acc[c.amcType || 'AMC'] || 0) + (c.contractValue || 0);
          return acc;
        }, {} as Record<string, number>);

        reportData = {
          totalRevenue: contractsWithVirtuals.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          monthlyRevenue,
          revenueByStatus,
          revenueByType,
          averageRevenuePerContract: contractsWithVirtuals.length > 0 ? contractsWithVirtuals.reduce((sum, c) => sum + (c.contractValue || 0), 0) / contractsWithVirtuals.length : 0,
          topRevenueContracts: contractsWithVirtuals
            .filter(c => c.contractValue && c.contractValue > 0)
            .sort((a, b) => (b.contractValue || 0) - (a.contractValue || 0))
            .slice(0, 10)
            .map(c => ({
              contractNumber: c.contractNumber,
              customer: c.customer ? (c.customer as any).name : 'Unknown',
              contractValue: c.contractValue,
              amcType: c.amcType,
              status: c.status,
              createdAt: c.createdAt
            }))
        };
        break;

      case 'visit_completion':
        const visitStats = contractsWithVirtuals.reduce((acc, c) => {
          acc.totalScheduled += c.numberOfVisits || 0;
          acc.totalCompleted += c.completedVisits || 0;
          acc.overdueVisits += Math.max(0, (c.numberOfVisits || 0) - (c.completedVisits || 0));
          
          // Count visits by status from visitSchedule
          if (c.visitSchedule && Array.isArray(c.visitSchedule)) {
            c.visitSchedule.forEach((visit: any) => {
              if (visit.status === 'completed') acc.completedVisitsDetailed++;
              else if (visit.status === 'pending') acc.pendingVisitsDetailed++;
              else if (visit.status === 'cancelled') acc.cancelledVisitsDetailed++;
            });
          }
          
          return acc;
        }, { 
          totalScheduled: 0, 
          totalCompleted: 0, 
          overdueVisits: 0,
          completedVisitsDetailed: 0,
          pendingVisitsDetailed: 0,
          cancelledVisitsDetailed: 0
        });

        reportData = {
          ...visitStats,
          completionRate: visitStats.totalScheduled > 0 ? (visitStats.totalCompleted / visitStats.totalScheduled) * 100 : 0,
          contracts: contractsWithVirtuals.map(c => ({
            contractNumber: c.contractNumber,
            customer: c.customer ? (c.customer as any).name : 'Unknown',
            engineSerialNumber: c.engineSerialNumber,
            scheduledVisits: c.numberOfVisits || 0,
            completedVisits: c.completedVisits || 0,
            completionRate: (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
            nextVisitDate: c.nextVisitDate,
            visitSchedule: c.visitSchedule?.map((visit: any) => ({
              scheduledDate: visit.scheduledDate,
              status: visit.status,
              completedDate: visit.completedDate,
              assignedTo: visit.assignedTo ? `${(visit.assignedTo as any).firstName} ${(visit.assignedTo as any).lastName}` : 'Unassigned'
            })) || []
          }))
        };
        break;



      case 'expiring_contracts':
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringContracts = contractsWithVirtuals.filter(c => {
          if (c.status !== AMCStatus.ACTIVE) return false;
          if (!c.amcEndDate) return false;
          const endDate = new Date(c.amcEndDate);
          return endDate <= thirtyDaysFromNow;
        });

        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

        const expiringIn60Days = contractsWithVirtuals.filter(c => {
          if (c.status !== AMCStatus.ACTIVE) return false;
          if (!c.amcEndDate) return false;
          const endDate = new Date(c.amcEndDate);
          return endDate > thirtyDaysFromNow && endDate <= sixtyDaysFromNow;
        });

        reportData = {
          expiringContracts: expiringContracts.length,
          expiringIn60Days: expiringIn60Days.length,
          totalValueAtRisk: expiringContracts.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          totalValueAtRisk60Days: expiringIn60Days.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          contracts: expiringContracts.map(c => ({
            contractNumber: c.contractNumber,
            customer: c.customer ? {
              name: (c.customer as any).name,
              email: (c.customer as any).email,
              phone: (c.customer as any).phone
            } : null,
            engineSerialNumber: c.engineSerialNumber,
            engineModel: c.engineModel,
            amcType: c.amcType,
            amcEndDate: c.amcEndDate,
            contractValue: c.contractValue || 0,
            daysUntilExpiry: c.daysUntilExpiry,
            numberOfVisits: c.numberOfVisits,
            completedVisits: c.completedVisits,
            completionPercentage: c.completionPercentage,
            contactPersonName: c.contactPersonName,
            contactNumber: c.contactNumber
          })),
          contracts60Days: expiringIn60Days.map(c => ({
            contractNumber: c.contractNumber,
            customer: c.customer ? (c.customer as any).name : 'Unknown',
            amcEndDate: c.amcEndDate,
            contractValue: c.contractValue || 0,
            daysUntilExpiry: c.daysUntilExpiry
          }))
        };
        break;

      case 'performance_metrics':
        const performanceData = contractsWithVirtuals.reduce((acc, c) => {
          // Response time calculation (if visitSchedule has completion dates)
          if (c.visitSchedule && Array.isArray(c.visitSchedule)) {
            c.visitSchedule.forEach((visit: any) => {
              if (visit.status === 'completed' && visit.completedDate && visit.scheduledDate) {
                const scheduled = new Date(visit.scheduledDate);
                const completed = new Date(visit.completedDate);
                const responseTime = Math.abs(completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60); // hours
                acc.totalResponseTime += responseTime;
                acc.completedVisitsCount++;
              }
            });
          }
          
          // Contract duration analysis
          if (c.amcStartDate && c.amcEndDate) {
            const startDate = new Date(c.amcStartDate);
            const endDate = new Date(c.amcEndDate);
            const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24); // days
            acc.totalDuration += duration;
            acc.contractsWithDuration++;
          }
          
          return acc;
        }, {
          totalResponseTime: 0,
          completedVisitsCount: 0,
          totalDuration: 0,
          contractsWithDuration: 0
        });

        // Aggregate engineer performance based on completed visits
        const engineerStats = new Map<string, { completed: number; total: number; user: any }>();
        contractsWithVirtuals.forEach((contract: any) => {
          if (contract.visitSchedule && Array.isArray(contract.visitSchedule)) {
            contract.visitSchedule.forEach((visit: any) => {
              const assigned = visit.assignedTo;
              if (!assigned) return;

              const engineerId = typeof assigned === 'string'
                ? assigned
                : (assigned._id?.toString?.() || assigned.toString?.());
              if (!engineerId) return;

              const existing = engineerStats.get(engineerId) || { completed: 0, total: 0, user: assigned };
              existing.total += 1;
              if (visit.status === 'completed') existing.completed += 1;
              if (typeof assigned === 'object') {
                existing.user = assigned;
              }
              engineerStats.set(engineerId, existing);
            });
          }
        });

        let bestEngineer: any = null;
        if (engineerStats.size > 0) {
          bestEngineer = Array.from(engineerStats.entries())
            .map(([id, stat]) => ({
              id,
              name: (stat.user?.fullName) || [stat.user?.firstName, stat.user?.lastName].filter(Boolean).join(' ') || stat.user?.email || 'Unknown',
              email: stat.user?.email || '',
              completedVisits: stat.completed,
              totalVisits: stat.total,
              completionRate: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
            }))
            .sort((a, b) => b.completedVisits - a.completedVisits)[0];
        }

        reportData = {
          averageResponseTime: performanceData.completedVisitsCount > 0 ? 
            performanceData.totalResponseTime / performanceData.completedVisitsCount : 0,
          averageContractDuration: performanceData.contractsWithDuration > 0 ? 
            performanceData.totalDuration / performanceData.contractsWithDuration : 0,
          totalContracts: contractsWithVirtuals.length,
          activeContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.ACTIVE).length,
          completionRate: contractsWithVirtuals.reduce((sum, c) => {
            if (c.numberOfVisits && c.numberOfVisits > 0) {
              return sum + ((c.completedVisits || 0) / c.numberOfVisits);
            }
            return sum;
          }, 0) / contractsWithVirtuals.length * 100,
          contracts: contractsWithVirtuals.slice(0, 20).map(c => ({
            contractNumber: c.contractNumber,
            customer: c.customer ? (c.customer as any).name : 'Unknown',
            status: c.status,
            completionRate: (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
            daysUntilExpiry: c.daysUntilExpiry,
            contractValue: c.contractValue || 0
          })),
          bestEngineer
        };
        break;

      default:
        throw new AppError('Invalid report type', 400);
    }

    // Add metadata for traceability
    reportData.metadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.id || 'unknown',
      filters: {
        dateFrom,
        dateTo,
        customer,
        status
      },
      totalRecords: contractsWithVirtuals.length,
      reportType: type
    };

    const response: APIResponse = {
      success: true,
      message: `${type.replace('_', ' ')} report generated successfully`,
      data: reportData
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Enhanced visit scheduling with automatic scheduling
// @route   POST /api/v1/amc/:id/schedule-visit-enhanced
// @access  Private
export const scheduleEnhancedVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      scheduledDate,
      assignedTo,
      visitType = 'routine',
      autoSchedule = false,
      scheduleType = 'manual' // manual, automatic, optimized
    } = req.body;

    const amc = await AMC.findById(id)
      .populate('customer', 'name email phone address')
      .populate('products', 'name category brand modelNumber');

    if (!amc) {
      throw new AppError('AMC contract not found', 404);
    }

    let visitSchedule: any[] = [];

    if (autoSchedule) {
      // Generate automatic visit schedule based on contract terms
      const startDate = new Date(amc.amcStartDate || amc.startDate);
      const endDate = new Date(amc.amcEndDate || amc.endDate);
      const numberOfVisits = amc.numberOfVisits || amc.scheduledVisits;
      
      // Calculate the interval in months based on contract duration and number of visits
      const totalMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (endDate.getMonth() - startDate.getMonth());
      const intervalMonths = Math.floor(totalMonths / numberOfVisits);

      for (let i = 0; i < numberOfVisits; i++) {
        const visitDate = new Date(startDate);
        // Schedule visits with proper interval (first visit after interval, not on start date)
        visitDate.setMonth(startDate.getMonth() + ((i + 1) * intervalMonths));

        visitSchedule.push({
          scheduledDate: visitDate.toISOString(),
          assignedTo: assignedTo || amc.createdBy,
          visitType: 'routine',
          status: 'pending'
        });
      }
    } else {
      // Single visit scheduling
      visitSchedule = [{
        scheduledDate,
        assignedTo,
        visitType,
        status: 'pending'
      }];
    }

    // Update AMC with new visit schedule
    // Replace existing visit schedule instead of appending
    amc.visitSchedule = visitSchedule;
    await amc.save();

    const response: APIResponse = {
      success: true,
      message: 'Visit(s) scheduled successfully',
      data: { visits: visitSchedule, amc }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk schedule visits for AMC contract
// @route   POST /api/v1/amc/:id/schedule-visits-bulk
// @access  Private
export const scheduleVisitsBulk = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { visits } = req.body; // Array of visit objects

    if (!Array.isArray(visits) || visits.length === 0) {
      return next(new AppError('Visits array is required and cannot be empty', 400));
    }

    const amc = await AMC.findById(id)
      .populate('customer', 'name email phone address')
      .populate('products', 'name category brand modelNumber');

    if (!amc) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Validate each visit
    const validatedVisits = visits.map((visit, index) => {
      if (!visit.scheduledDate) {
        throw new AppError(`Visit ${index + 1}: Scheduled date is required`, 400);
      }
      if (!visit.assignedTo) {
        throw new AppError(`Visit ${index + 1}: Assigned engineer is required`, 400);
      }

      // Validate date format
      const scheduledDate = new Date(visit.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        throw new AppError(`Visit ${index + 1}: Invalid date format`, 400);
      }

      // Validate that assignedTo is a valid ObjectId
      if (!visit.assignedTo.match(/^[0-9a-fA-F]{24}$/)) {
        throw new AppError(`Visit ${index + 1}: Invalid engineer ID format`, 400);
      }

      return {
        scheduledDate: scheduledDate,
        assignedTo: visit.assignedTo,
        visitType: visit.visitType || 'routine',
        status: 'pending' as const
      };
    });

    // Replace the entire visit schedule with the new visits
    amc.visitSchedule = validatedVisits;
    
    // Set next visit date to the first scheduled visit
    if (validatedVisits.length > 0) {
      amc.nextVisitDate = validatedVisits[0].scheduledDate;
    }

    await amc.save();

    const populatedContract = await AMC.findById(amc._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: `${validatedVisits.length} visit(s) scheduled successfully`,
      data: { 
        contract: populatedContract,
        scheduledVisits: validatedVisits
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk contract renewal
// @route   POST /api/v1/amc/bulk-renew
// @access  Private
export const bulkRenewContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractIds, renewalTerms, priceAdjustment } = req.body;

    const contracts = await AMC.find({ _id: { $in: contractIds } })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber');

    if (contracts.length === 0) {
      throw new AppError('No valid contracts found for renewal', 404);
    }

    const renewedContracts = [];

    for (const contract of contracts) {
      // Calculate new end date (extend by original duration)
      const originalStart = new Date(contract.startDate);
      const originalEnd = new Date(contract.endDate);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStartDate = new Date(originalEnd);
      const newEndDate = new Date(newStartDate.getTime() + duration);

      // Apply price adjustment if specified
      let newContractValue = contract.contractValue;
      if (priceAdjustment) {
        if (priceAdjustment.type === 'percentage') {
          newContractValue = contract.contractValue * (1 + priceAdjustment.value / 100);
        } else if (priceAdjustment.type === 'fixed') {
          newContractValue = contract.contractValue + priceAdjustment.value;
        }
      }

      // Calculate next visit date (30 days from start)
      const nextVisitDate = new Date(newStartDate);
      nextVisitDate.setDate(nextVisitDate.getDate() + 30);

      // Update existing contract with new details
      contract.startDate = newStartDate;
      contract.endDate = newEndDate;
      contract.contractValue = newContractValue;
      contract.status = AMCStatus.ACTIVE;
      contract.terms = renewalTerms || contract.terms;
      contract.nextVisitDate = nextVisitDate;
      contract.completedVisits = 0; // Reset completed visits

      await contract.save();

      // Populate the updated contract for response
      const populatedContract = await AMC.findById(contract._id)
        .populate('customer', 'name email phone')
        .populate('products', 'name category brand modelNumber')
        .populate('createdBy', 'firstName lastName email');

      renewedContracts.push(populatedContract);
    }

    const response: APIResponse = {
      success: true,
      message: `${renewedContracts.length} contracts renewed successfully`,
      data: { renewedContracts }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC performance metrics
// @route   GET /api/v1/amc/:id/performance
// @access  Private
export const getAMCPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const amc = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand modelNumber')
      .populate('visitSchedule.assignedTo', 'firstName lastName email');

    if (!amc) {
      throw new AppError('AMC contract not found', 404);
    }

    // Calculate performance metrics
    const totalVisits = amc.scheduledVisits;
    const completedVisits = amc.completedVisits;
    const completionRate = totalVisits > 0 ? (completedVisits / totalVisits) * 100 : 0;

    const daysUntilExpiry = Math.ceil((new Date(amc.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const contractProgress = Math.max(0, Math.min(100, ((new Date().getTime() - new Date(amc.startDate).getTime()) / (new Date(amc.endDate).getTime() - new Date(amc.startDate).getTime())) * 100));

    const performanceMetrics = {
      contractProgress,
      completionRate,
      daysUntilExpiry,
      remainingVisits: totalVisits - completedVisits,
      overdueVisits: Math.max(0, totalVisits - completedVisits),
      averageResponseTime: 0,
      customerSatisfaction: 0,
      issueResolutionRate: 0
    };

    const response: APIResponse = {
      success: true,
      message: 'AMC performance metrics retrieved successfully',
      data: { amc, performanceMetrics }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contract by ID with full details
// @route   GET /api/v1/amc/:id/details
// @access  Private
export const getAMCDetails = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id)
      .select('contractNumber customer customerAddress contactPersonName contactNumber engineSerialNumber engineModel kva dgMake dateOfCommissioning amcStartDate amcEndDate amcType numberOfVisits numberOfOilServices products startDate endDate contractValue scheduledVisits completedVisits status nextVisitDate visitSchedule terms createdBy createdAt updatedAt')
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand modelNumber serialNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Calculate additional metrics
    const daysUntilExpiry = Math.ceil((new Date(contract.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const completionRate = contract.scheduledVisits > 0 ? (contract.completedVisits / contract.scheduledVisits) * 100 : 0;
    const remainingVisits = Math.max(0, contract.scheduledVisits - contract.completedVisits);

    const response: APIResponse = {
      success: true,
      message: 'AMC contract details retrieved successfully',
      data: {
        contract,
        metrics: {
          daysUntilExpiry,
          completionRate,
          remainingVisits,
          overdueVisits: Math.max(0, contract.scheduledVisits - contract.completedVisits)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract status
// @route   PUT /api/v1/amc/:id/status
// @access  Private
export const updateAMCStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, reason } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    contract.status = status;
    if (reason) {
      contract.terms = contract.terms ? `${contract.terms}\n\nStatus Update: ${reason}` : `Status Update: ${reason}`;
    }

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC contract status updated successfully',
      data: { contract }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contracts by customer
// @route   GET /api/v1/amc/customer/:customerId
// @access  Private
export const getAMCsByCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, status } = req.query as {
      page?: string;
      limit?: string;
      status?: AMCStatus;
    };

    const query: any = { customer: customerId };
    if (status) {
      query.status = status;
    }

    const contracts = await AMC.find(query)
      .populate('products', 'name category brand modelNumber')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AMC.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'Customer AMC contracts retrieved successfully',
      data: { contracts },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contracts expiring soon
// @route   GET /api/v1/amc/expiring-soon
// @access  Private
export const getExpiringSoon = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const expiringContracts = await AMC.find({
      endDate: { $lte: expiryDate },
      status: AMCStatus.ACTIVE
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .sort({ endDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts expiring in ${days} days retrieved successfully`,
      data: {
        contracts: expiringContracts,
        count: expiringContracts.length,
        totalValue: expiringContracts.reduce((sum, c) => sum + c.contractValue, 0)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC contracts requiring visits
// @route   GET /api/v1/amc/visits-due
// @access  Private
export const getVisitsDue = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 7 } = req.query;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    // Find contracts where next visit is due or overdue
    const contractsDue = await AMC.find({
      status: AMCStatus.ACTIVE,
      $or: [
        { nextVisitDate: { $lte: dueDate } },
        { completedVisits: { $lt: '$scheduledVisits' } }
      ]
    })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .sort({ nextVisitDate: 1 });

    const response: APIResponse = {
      success: true,
      message: `Contracts with visits due in ${days} days retrieved successfully`,
      data: {
        contracts: contractsDue,
        count: contractsDue.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC dashboard statistics
// @route   GET /api/v1/amc/dashboard
// @access  Private
export const getAMCDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalContracts,
      activeContracts,
      expiredContracts,
      expiringSoon,
      totalValue,
      monthlyRevenue
    ] = await Promise.all([
      AMC.countDocuments(),
      AMC.countDocuments({ status: AMCStatus.ACTIVE }),
      AMC.countDocuments({ status: AMCStatus.EXPIRED }),
      AMC.countDocuments({
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        status: AMCStatus.ACTIVE
      }),
      AMC.aggregate([
        { $match: { status: AMCStatus.ACTIVE } },
        { $group: { _id: null, total: { $sum: '$contractValue' } } }
      ]),
      AMC.aggregate([
        { $match: { status: AMCStatus.ACTIVE } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$contractValue' }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'AMC dashboard statistics retrieved successfully',
      data: {
        totalContracts,
        activeContracts,
        expiredContracts,
        expiringSoon,
        totalValue: totalValue[0]?.total || 0,
        monthlyRevenue,
        completionRate: activeContracts > 0 ? (activeContracts / totalContracts) * 100 : 0
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete AMC contract
// @route   DELETE /api/v1/amc/:id
// @access  Private (Admin/Super Admin only)
export const deleteAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the contract first to check if it exists
    const contract = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Check if contract can be deleted (not active contracts)
    if (contract.status === AMCStatus.ACTIVE) {
      return next(new AppError('Cannot delete active contracts. Please cancel or expire the contract first.', 400));
    }

    // Check if contract has completed visits (optional business rule)
    if (contract.completedVisits > 0) {
      return next(new AppError('Cannot delete contracts with completed visits. Please archive instead.', 400));
    }

    // Delete the contract
    await AMC.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'AMC contract deleted successfully',
      data: {
        deletedContract: {
          _id: contract._id,
          contractNumber: contract.contractNumber,
          customer: contract.customer,
          products: contract.products,
          status: contract.status,
          deletedAt: new Date()
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete AMC contracts
// @route   DELETE /api/v1/amc/bulk-delete
// @access  Private (Admin/Super Admin only)
export const bulkDeleteAMCContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractIds, reason } = req.body;

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return next(new AppError('Contract IDs are required', 400));
    }

    // Find all contracts to check their status
    const contracts = await AMC.find({ _id: { $in: contractIds } })
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (contracts.length === 0) {
      return next(new AppError('No valid contracts found', 404));
    }

    // Check for active contracts
    const activeContracts = contracts.filter(c => c.status === AMCStatus.ACTIVE);
    if (activeContracts.length > 0) {
      return next(new AppError(`Cannot delete ${activeContracts.length} active contracts. Please cancel or expire them first.`, 400));
    }

    // Check for contracts with completed visits
    const contractsWithVisits = contracts.filter(c => c.completedVisits > 0);
    if (contractsWithVisits.length > 0) {
      return next(new AppError(`Cannot delete ${contractsWithVisits.length} contracts with completed visits. Please archive instead.`, 400));
    }

    // Delete all contracts
    const deleteResult = await AMC.deleteMany({ _id: { $in: contractIds } });

    const response: APIResponse = {
      success: true,
      message: `${deleteResult.deletedCount} AMC contracts deleted successfully`,
      data: {
        deletedCount: deleteResult.deletedCount,
        deletedContracts: contracts.map(c => ({
          _id: c._id,
          contractNumber: c.contractNumber,
          customer: c.customer,
          status: c.status
        })),
        reason: reason || 'Bulk deletion'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Archive AMC contract (soft delete)
// @route   PUT /api/v1/amc/:id/archive
// @access  Private (Admin/Super Admin only)
export const archiveAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const contract = await AMC.findById(id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand');

    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Archive the contract by setting status to cancelled
    contract.status = AMCStatus.CANCELLED;
    if (reason) {
      contract.terms = contract.terms ? `${contract.terms}\n\nArchived: ${reason}` : `Archived: ${reason}`;
    }

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC contract archived successfully',
      data: {
        contract,
        archivedAt: new Date(),
        reason: reason || 'Manual archive'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Regenerate visit schedule for AMC contract
// @route   PUT /api/v1/amc/:id/regenerate-visits
// @access  Private
export const regenerateVisitSchedule = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Check if contract has completed visits
    if (contract.completedVisits > 0) {
      return next(new AppError('Cannot regenerate visit schedule for contracts with completed visits', 400));
    }

    // Calculate the interval in months based on contract duration and number of visits
    const totalMonths = (contract.amcEndDate.getFullYear() - contract.amcStartDate.getFullYear()) * 12 + 
                       (contract.amcEndDate.getMonth() - contract.amcStartDate.getMonth());
    const intervalMonths = Math.floor(totalMonths / contract.numberOfVisits);
    
    // Clear existing visit schedule
    contract.visitSchedule = [];
    
    // Generate new visit schedule
    for (let i = 0; i < contract.numberOfVisits; i++) {
      const visitDate = new Date(contract.amcStartDate);
      // Schedule visits with proper interval (first visit after interval, not on start date)
      visitDate.setMonth(contract.amcStartDate.getMonth() + ((i + 1) * intervalMonths));
      
      contract.visitSchedule.push({
        scheduledDate: visitDate,
        status: 'pending' as const
      });
    }
    
    // Set next visit date to first visit
    contract.nextVisitDate = contract.visitSchedule[0].scheduledDate;
    
    await contract.save();

    const populatedContract = await AMC.findById(contract._id)
      .populate('customer', 'name email phone')
      .populate('products', 'name category brand')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'Visit schedule regenerated successfully',
      data: { 
        contract: populatedContract,
        newSchedule: contract.visitSchedule
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Get AMC contracts by visit scheduled date range
// @route   GET /api/v1/amc/visits-by-date
// @access  Private
export const getAMCsByVisitDate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      startDate, 
      endDate,
      page = 1, 
      limit = 10, 
      status = 'all',
      customer = 'all'
    } = req.query as {
      startDate: string;
      endDate: string;
      page?: string;
      limit?: string;
      status?: string;
      customer?: string;
    };

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    // Parse the dates
    let startDateParsed: Date;
    let endDateParsed: Date;
    
    if (startDate.includes('/')) {
      // Handle DD/MM/YYYY format
      const [day, month, year] = startDate.split('/');
      startDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      startDateParsed = new Date(startDate);
    }
    
    if (endDate.includes('/')) {
      // Handle DD/MM/YYYY format
      const [day, month, year] = endDate.split('/');
      endDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      endDateParsed = new Date(endDate);
    }
    
    if (isNaN(startDateParsed.getTime()) || isNaN(endDateParsed.getTime())) {
      return next(new AppError('Invalid date format', 400));
    }

    // Set the date range to cover full days (00:00:00 to 23:59:59)
    const startOfDay = new Date(startDateParsed);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(endDateParsed);
    endOfDay.setHours(23, 59, 59, 999);

    // Build the query - use $elemMatch to match array elements within date range
    const query: any = {
      visitSchedule: {
        $elemMatch: {
          scheduledDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      }
    };

    // Add status filter if specified
    if (status && status !== 'all') {
      query.status = status;
    }

    // Add customer filter if specified
    if (customer && customer !== 'all') {
      query.customer = customer;
    }

    // Execute query with pagination
    const contracts = await AMC.find(query)
      .select('contractNumber customer customerAddress contactPersonName contactNumber engineSerialNumber engineModel kva dgMake dateOfCommissioning amcStartDate amcEndDate amcType numberOfVisits numberOfOilServices products startDate endDate contractValue scheduledVisits completedVisits status nextVisitDate visitSchedule terms createdBy createdAt updatedAt')
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort('-createdAt')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Get total count for pagination
    const total = await AMC.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    // Calculate virtual fields manually since .lean() doesn't include them
    const contractsWithVirtuals = contracts.map(contract => {
      // Calculate days until expiry
      let daysUntilExpiry = null;
      if (contract.amcEndDate) {
        const now = new Date();
        const endDate = new Date(contract.amcEndDate);
        const diff = endDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      // Calculate completion percentage
      let completionPercentage = 0;
      if (contract.numberOfVisits && contract.numberOfVisits > 0) {
        completionPercentage = Math.round(((contract.completedVisits || 0) / contract.numberOfVisits) * 100);
      }

      return {
        ...contract.toObject(),
        daysUntilExpiry,
        completionPercentage
      };
    });

    // Process the results to include visit details for the date range
    const processedContracts = contractsWithVirtuals.map(contract => {
      // Filter visit schedule to only include visits within the date range
      const visitsInRange = (contract.visitSchedule || []).filter((visit: any) => {
        const visitDate = new Date(visit.scheduledDate);
        return visitDate >= startOfDay && visitDate <= endOfDay;
      });

      return {
        ...contract,
        visitsInRange,
        visitCountInRange: visitsInRange.length
      };
    });

    // Calculate summary statistics for the date range
    const totalVisitsInRange = processedContracts.reduce((sum, contract) => sum + contract.visitCountInRange, 0);
    const uniqueCustomers = new Set(processedContracts.map(c => c.customer._id.toString())).size;
    const totalContractValue = processedContracts.reduce((sum, contract) => sum + (contract.contractValue || 0), 0);

    // Calculate visits per day in the range
    const daysInRange = Math.ceil((endOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const averageVisitsPerDay = daysInRange > 0 ? totalVisitsInRange / daysInRange : 0;

    const response: APIResponse = {
      success: true,
      message: `AMC contracts with visits scheduled between ${startDate} and ${endDate} retrieved successfully`,
      data: { 
        contracts: processedContracts,
        summary: {
          totalContracts: processedContracts.length,
          totalVisitsInRange,
          uniqueCustomers,
          totalContractValue,
          startDate: startDate,
          endDate: endDate,
          daysInRange,
          averageVisitsPerDay: Math.round(averageVisitsPerDay * 100) / 100
        }
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

// @desc    Get visit schedule summary by date range
// @route   GET /api/v1/amc/visit-schedule-summary
// @access  Private
export const getVisitScheduleSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      startDate, 
      endDate,
      status = 'all'
    } = req.query as {
      startDate: string;
      endDate: string;
      status?: string;
    };

    if (!startDate || !endDate) {
      return next(new AppError('Start date and end date are required', 400));
    }

    // Parse the dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format', 400));
    }

    // Set time to cover full days
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Build the query
    const query: any = {
      'visitSchedule.scheduledDate': {
        $gte: start,
        $lte: end
      }
    };

    // Add status filter if specified
    if (status && status !== 'all') {
      query.status = status;
    }

    // Aggregate to get visit schedule summary
    const summary = await AMC.aggregate([
      { $match: query },
      { $unwind: '$visitSchedule' },
      {
        $match: {
          'visitSchedule.scheduledDate': {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$visitSchedule.scheduledDate' } },
            status: '$visitSchedule.status'
          },
          count: { $sum: 1 },
          contracts: { $addToSet: '$_id' },
          contractNumbers: { $addToSet: '$contractNumber' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          visits: {
            $push: {
              status: '$_id.status',
              count: '$count',
              contracts: '$contracts',
              contractNumbers: '$contractNumbers'
            }
          },
          totalVisits: { $sum: '$count' },
          uniqueContracts: { $addToSet: '$_id' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get additional statistics
    const totalContracts = await AMC.countDocuments(query);
    const totalVisitsInRange = summary.reduce((sum, day) => sum + day.totalVisits, 0);

    const response: APIResponse = {
      success: true,
      message: 'Visit schedule summary retrieved successfully',
      data: {
        summary,
        statistics: {
          totalContracts,
          totalVisitsInRange,
          dateRange: { startDate, endDate }
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 

// @desc    Export AMC contracts to Excel with filters
// @route   GET /api/v1/amc/export-excel
// @access  Private
export const exportAMCToExcel = async (
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
      expiringIn,
      startDate,
      endDate
    } = req.query as {
      search?: string;
      status?: AMCStatus;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      expiringIn?: string;
      startDate?: string;
      endDate?: string;
    };

    // Build query based on filters
    const query: any = {};
    const orConditions: any[] = [];

    if (search) {
      orConditions.push(
        { contractNumber: { $regex: search, $options: 'i' } },
        { terms: { $regex: search, $options: 'i' } },
        { engineSerialNumber: { $regex: search, $options: 'i' } }
      );
      
      // Add customer name search for export as well
      try {
        const matchingCustomers = await Customer.find({
          name: { $regex: search, $options: 'i' }
        }).select('_id');
        
        if (matchingCustomers.length > 0) {
          const customerIds = matchingCustomers.map((c: any) => c._id);
          orConditions.push({ customer: { $in: customerIds } });
        }
      } catch (error) {
        console.error('Error searching customers for export:', error);
        // Continue with other search criteria if customer search fails
      }
    }

    if (status) {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Handle expiring contracts filter - FIXED: Don't override status if it's already set
    if (expiringIn) {
      const days = parseInt(expiringIn);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      query.endDate = { $lte: expiryDate };
      
      // Only set status to ACTIVE if no status filter is already applied
      if (!status) {
        query.status = AMCStatus.ACTIVE;
      }
    }

    // Handle visit date range filter
    if (startDate && endDate) {
      // Parse the dates
      let startDateParsed: Date;
      let endDateParsed: Date;
      
      if (startDate.includes('/')) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = startDate.split('/');
        startDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        startDateParsed = new Date(startDate);
      }
      
      if (endDate.includes('/')) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = endDate.split('/');
        endDateParsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        endDateParsed = new Date(endDate);
      }

      if (!isNaN(startDateParsed.getTime()) && !isNaN(endDateParsed.getTime())) {
        // Set the date range to cover full days (00:00:00 to 23:59:59)
        const startOfDay = new Date(startDateParsed);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(endDateParsed);
        endOfDay.setHours(23, 59, 59, 999);

        // Use $elemMatch to match array elements within date range
        query.visitSchedule = {
          $elemMatch: {
            scheduledDate: {
              $gte: startOfDay,
              $lte: endOfDay
            }
          }
        };
      }
    }

    // Add $or conditions if any exist
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    // Get total contracts count for comparison
    const totalContracts = await AMC.countDocuments({});

    // Fetch contracts with all necessary data
    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort('-createdAt');

    // Calculate virtual fields manually since .lean() doesn't include them
    const contractsWithVirtuals = contracts.map(contract => {
      // Calculate days until expiry
      let daysUntilExpiry = null;
      if (contract.amcEndDate) {
        const now = new Date();
        const endDate = new Date(contract.amcEndDate);
        const diff = endDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      // Calculate completion percentage
      let completionPercentage = 0;
      if (contract.numberOfVisits && contract.numberOfVisits > 0) {
        completionPercentage = Math.round(((contract.completedVisits || 0) / contract.numberOfVisits) * 100);
      }

      return {
        ...contract.toObject(),
        daysUntilExpiry,
        completionPercentage
      };
    });

    // Helper function to format dates for Excel
    const formatDateForExcel = (date: Date | string): string => {
      if (!date) return '';
      try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-IN');
      } catch (error) {
        return '';
      }
    };

    // Helper function to format currency for Excel
    const formatCurrencyForExcel = (amount: number): string => {
      if (!amount || isNaN(amount)) return '0.00';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(amount);
    };

    // Helper function to get customer name
    const getCustomerName = (customer: any): string => {
      if (!customer) return '';
      if (typeof customer === 'string') return customer;
      return customer.name || '';
    };

    // Helper function to get user name
    const getUserName = (user: any): string => {
      if (!user) return '';
      if (typeof user === 'string') return user;
      return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '';
    };

    // Helper function to calculate days until expiry
    const getDaysUntilExpiry = (endDate: Date | string): number => {
      if (!endDate) return 0;
      try {
        const end = new Date(endDate);
        const now = new Date();
        const diffTime = end.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      } catch (error) {
        return 0;
      }
    };

    // Helper function to calculate completion percentage
    const getCompletionPercentage = (completed: number, scheduled: number): number => {
      if (!scheduled || scheduled === 0) return 0;
      return Math.round((completed / scheduled) * 100);
    };

        // Export data with all information
    const excelData = contractsWithVirtuals.map((contract, index) => {
      // Get visit schedule information
      const maxVisits = Math.max(contract.numberOfVisits || contract.scheduledVisits || 0, 
                                contract.visitSchedule ? contract.visitSchedule.length : 0);
      
      // Create base object with common fields
      const baseData: any = {
        'S.No': index + 1,
        'Contract Number': contract.contractNumber,
        'Customer Name': getCustomerName(contract.customer),
        'Customer Email': contract.customer && typeof contract.customer === 'object' ? (contract.customer as any).email : '',
        'Customer Phone': contract.customer && typeof contract.customer === 'object' ? (contract.customer as any).phone : '',
        'Customer Type': contract.customer && typeof contract.customer === 'object' ? (contract.customer as any).customerType : '',
        'Customer Address': contract.customerAddress || (contract.customer && typeof contract.customer === 'object' ? (contract.customer as any).address : ''),
        'Contact Person': contract.contactPersonName || '',
        'Contact Number': contract.contactNumber || '',
        'Engine Serial Number': contract.engineSerialNumber || '',
        'Engine Model': contract.engineModel || '',
        'KVA Rating': contract.kva || '',
        'DG Make': contract.dgMake || '',
        'Date of Commissioning': formatDateForExcel(contract.dateOfCommissioning),
        'AMC Type': contract.amcType || 'AMC',
        'Number of Visits': contract.numberOfVisits || contract.scheduledVisits,
        'Number of Oil Services': contract.numberOfOilServices || 0,
        'AMC Start Date': formatDateForExcel(contract.amcStartDate || contract.startDate),
        'AMC End Date': formatDateForExcel(contract.amcEndDate || contract.endDate),
        'Status': contract.status,
        'Days Until Expiry': getDaysUntilExpiry(contract.amcEndDate || contract.endDate),
        'Scheduled Visits': contract.scheduledVisits || contract.numberOfVisits,
        'Completed Visits': contract.completedVisits,
        'Remaining Visits': Math.max(0, (contract.scheduledVisits || contract.numberOfVisits) - contract.completedVisits),
        'Completion %': getCompletionPercentage(contract.completedVisits, contract.scheduledVisits || contract.numberOfVisits)
      };

      // Add visit-specific columns
      for (let i = 1; i <= maxVisits; i++) {
        const visit = contract.visitSchedule && contract.visitSchedule[i - 1];
        if (visit) {
          baseData[`Visit ${i} Date`] = formatDateForExcel(visit.scheduledDate);
          baseData[`Visit ${i} Engineer`] = getUserName(visit.assignedTo) || 'Unassigned';
        } else {
          baseData[`Visit ${i} Date`] = '';
          baseData[`Visit ${i} Engineer`] = '';
        }
      }

      return baseData;
    });

        // Create Excel workbook
    const XLSX = require('xlsx');
    const workbook = XLSX.utils.book_new();
    
    // Set column widths
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 20 },  // Contract Number
      { wch: 30 },  // Customer Name
      { wch: 25 },  // Customer Email
      { wch: 15 },  // Customer Phone
      { wch: 15 },  // Customer Type
      { wch: 40 },  // Customer Address
      { wch: 20 },  // Contact Person
      { wch: 15 },  // Contact Number
      { wch: 20 },  // Engine Serial Number
      { wch: 15 },  // Engine Model
      { wch: 12 },  // KVA Rating
      { wch: 15 },  // DG Make
      { wch: 20 },  // Date of Commissioning
      { wch: 10 },  // AMC Type
      { wch: 15 },  // Number of Visits
      { wch: 20 },  // Number of Oil Services
      { wch: 12 },  // AMC Start Date
      { wch: 12 },  // AMC End Date
      { wch: 12 },  // Status
      { wch: 15 },  // Days Until Expiry
      { wch: 15 },  // Scheduled Visits
      { wch: 15 },  // Completed Visits
      { wch: 15 },  // Remaining Visits
      { wch: 12 }   // Completion %
    ];

    // Add column widths for visit-specific columns (up to 12 visits)
    for (let i = 1; i <= 12; i++) {
      columnWidths.push({ wch: 15 }); // Visit X Date
      columnWidths.push({ wch: 20 }); // Visit X Engineer
    }

    // Create worksheet directly from data (no title row)
    let worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = columnWidths;

    // Add styling to headers (row 1)
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Row 0 (first row)
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          fill: {
            fgColor: { rgb: "4472C4" }, // Blue background
            patternType: "solid"
          },
          font: {
            bold: true,
            color: { rgb: "FFFFFF" } // White text
          },
          alignment: {
            horizontal: "center",
            vertical: "center"
          }
        };
      }
    }

    // Add the worksheet to workbook
    const sheetName = `AMC_Export_${new Date().toISOString().split('T')[0]}`;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="AMC_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);

  } catch (error) {
    next(error);
  }
}; 

// @desc    Export AMC report to Excel
// @route   GET /api/v1/amc/report/export-excel
// @access  Private
export const exportAMCReportToExcel = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      reportType,
      dateFrom,
      dateTo,
      status,
      format = 'excel'
    } = req.query as {
      reportType: string;
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      format?: string;
    };

    if (!reportType) {
      return next(new AppError('Report type is required', 400));
    }

    // Build query based on filters
    const query: any = {};
    const orConditions: any[] = [];

    if (dateFrom || dateTo) {
      query.$or = [];
      if (dateFrom) {
        query.$or.push({ createdAt: { $gte: new Date(dateFrom) } });
        query.$or.push({ amcStartDate: { $gte: new Date(dateFrom) } });
        query.$or.push({ amcEndDate: { $gte: new Date(dateFrom) } });
      }
      if (dateTo) {
        query.$or.push({ createdAt: { $lte: new Date(dateTo) } });
        query.$or.push({ amcStartDate: { $lte: new Date(dateTo) } });
        query.$or.push({ amcEndDate: { $lte: new Date(dateTo) } });
      }
    }

    if (status) {
      query.status = status;
    }

    // Add $or conditions if any exist
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    // Fetch contracts with all necessary data
    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType address')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort('-createdAt')
      .lean();

    // Calculate virtual fields manually since .lean() doesn't include them
    const contractsWithVirtuals = contracts.map(contract => {
      // Calculate days until expiry
      let daysUntilExpiry = null;
      if (contract.amcEndDate) {
        const now = new Date();
        const endDate = new Date(contract.amcEndDate);
        const diff = endDate.getTime() - now.getTime();
        daysUntilExpiry = Math.ceil(diff / (1000 * 60 * 60 * 24));
      }

      // Calculate completion percentage
      let completionPercentage = 0;
      if (contract.numberOfVisits && contract.numberOfVisits > 0) {
        completionPercentage = Math.round(((contract.completedVisits || 0) / contract.numberOfVisits) * 100);
      }

      return {
        ...contract,
        daysUntilExpiry,
        completionPercentage
      };
    });

    // Generate report data based on report type
    let reportData: any = {};
    
    switch (reportType) {
      case 'contract_summary':
        reportData = {
          totalContracts: contractsWithVirtuals.length,
          activeContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.ACTIVE).length,
          expiredContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.EXPIRED).length,
          pendingContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.PENDING).length,
          draftContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.DRAFT).length,
          totalValue: contractsWithVirtuals.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          contracts: contractsWithVirtuals.map(c => ({
            contractNumber: c.contractNumber,
            customerName: c.customer ? (c.customer as any).name : 'Unknown',
            engineSerialNumber: c.engineSerialNumber,
            engineModel: c.engineModel,
            kva: c.kva,
            dgMake: c.dgMake,
            amcType: c.amcType,
            numberOfVisits: c.numberOfVisits,
            numberOfOilServices: c.numberOfOilServices,
            amcStartDate: c.amcStartDate,
            amcEndDate: c.amcEndDate,
            contractValue: c.contractValue || 0,
            status: c.status,
            daysUntilExpiry: c.daysUntilExpiry,
            completionPercentage: c.completionPercentage,
            createdBy: c.createdBy ? `${(c.createdBy as any).firstName} ${(c.createdBy as any).lastName}` : 'Unknown',
            createdAt: c.createdAt
          }))
        };
        break;

      case 'revenue_analysis':
        const monthlyRevenue = contractsWithVirtuals.reduce((acc, c) => {
          const month = new Date(c.createdAt).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + (c.contractValue || 0);
          return acc;
        }, {} as Record<string, number>);

        reportData = {
          totalRevenue: contractsWithVirtuals.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          monthlyRevenue,
          revenueByStatus: contractsWithVirtuals.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + (c.contractValue || 0);
            return acc;
          }, {} as Record<string, number>),
          contracts: contractsWithVirtuals.map(c => ({
            contractNumber: c.contractNumber,
            customerName: c.customer ? (c.customer as any).name : 'Unknown',
            contractValue: c.contractValue,
            amcType: c.amcType,
            status: c.status,
            createdAt: c.createdAt,
            monthlyRevenue: monthlyRevenue[new Date(c.createdAt).toISOString().slice(0, 7)] || 0
          }))
        };
        break;

      case 'visit_completion':
        const visitStats = contractsWithVirtuals.reduce((acc, c) => {
          acc.totalScheduled += c.numberOfVisits || 0;
          acc.totalCompleted += c.completedVisits || 0;
          return acc;
        }, { totalScheduled: 0, totalCompleted: 0 });

        reportData = {
          ...visitStats,
          completionRate: visitStats.totalScheduled > 0 ? (visitStats.totalCompleted / visitStats.totalScheduled) * 100 : 0,
          contracts: contractsWithVirtuals.map(c => ({
            contractNumber: c.contractNumber,
            customerName: c.customer ? (c.customer as any).name : 'Unknown',
            engineSerialNumber: c.engineSerialNumber,
            scheduledVisits: c.numberOfVisits || 0,
            completedVisits: c.completedVisits || 0,
            completionRate: (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
            nextVisitDate: c.nextVisitDate
          }))
        };
        break;

      case 'expiring_contracts':
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringContracts = contractsWithVirtuals.filter(c => {
          if (c.status !== AMCStatus.ACTIVE) return false;
          if (!c.amcEndDate) return false;
          const endDate = new Date(c.amcEndDate);
          return endDate <= thirtyDaysFromNow;
        });

        reportData = {
          expiringContracts: expiringContracts.length,
          totalValueAtRisk: expiringContracts.reduce((sum, c) => sum + (c.contractValue || 0), 0),
          contracts: expiringContracts.map(c => ({
            contractNumber: c.contractNumber,
            customerName: c.customer ? (c.customer as any).name : 'Unknown',
            customerEmail: c.customer ? (c.customer as any).email : 'N/A',
            customerPhone: c.customer ? (c.customer as any).phone : 'N/A',
            engineSerialNumber: c.engineSerialNumber,
            engineModel: c.engineModel,
            amcType: c.amcType,
            amcEndDate: c.amcEndDate,
            contractValue: c.contractValue || 0,
            daysUntilExpiry: c.daysUntilExpiry,
            numberOfVisits: c.numberOfVisits,
            completedVisits: c.completedVisits,
            completionPercentage: c.completionPercentage,
            contactPersonName: c.contactPersonName,
            contactNumber: c.contactNumber
          }))
        };
        break;

      case 'performance_metrics':
        const performanceData = contractsWithVirtuals.reduce((acc, c) => {
          if (c.visitSchedule && Array.isArray(c.visitSchedule)) {
            c.visitSchedule.forEach((visit: any) => {
              if (visit.status === 'completed' && visit.completedDate && visit.scheduledDate) {
                const scheduled = new Date(visit.scheduledDate);
                const completed = new Date(visit.completedDate);
                const responseTime = Math.abs(completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
                acc.totalResponseTime += responseTime;
                acc.completedVisitsCount++;
              }
            });
          }
          
          if (c.amcStartDate && c.amcEndDate) {
            const startDate = new Date(c.amcStartDate);
            const endDate = new Date(c.amcEndDate);
            const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
            acc.totalDuration += duration;
            acc.contractsWithDuration++;
          }
          
          return acc;
        }, {
          totalResponseTime: 0,
          completedVisitsCount: 0,
          totalDuration: 0,
          contractsWithDuration: 0
        });

        reportData = {
          averageResponseTime: performanceData.completedVisitsCount > 0 ? 
            performanceData.totalResponseTime / performanceData.completedVisitsCount : 0,
          averageContractDuration: performanceData.contractsWithDuration > 0 ? 
            performanceData.totalDuration / performanceData.contractsWithDuration : 0,
          totalContracts: contractsWithVirtuals.length,
          activeContracts: contractsWithVirtuals.filter(c => c.status === AMCStatus.ACTIVE).length,
          completionRate: contractsWithVirtuals.reduce((sum, c) => {
            if (c.numberOfVisits && c.numberOfVisits > 0) {
              return sum + ((c.completedVisits || 0) / c.numberOfVisits);
            }
            return sum;
          }, 0) / contractsWithVirtuals.length * 100,
          contracts: contractsWithVirtuals.map(c => ({
            contractNumber: c.contractNumber,
            customerName: c.customer ? (c.customer as any).name : 'Unknown',
            status: c.status,
            completionRate: (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
            daysUntilExpiry: c.daysUntilExpiry,
            contractValue: c.contractValue || 0
          }))
        };
        break;

      default:
        return next(new AppError('Invalid report type', 400));
    }

    // Add metadata
    reportData.metadata = {
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.id || 'unknown',
      filters: {
        dateFrom,
        dateTo,
        status
      },
      totalRecords: contractsWithVirtuals.length,
      reportType
    };

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="AMC_Report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Generate Excel data based on report type
    let excelData = [];
    let sheetName = 'AMC Report';
    
    switch (reportType) {
      case 'contract_summary':
        sheetName = 'Contract Summary';
        excelData = contractsWithVirtuals.map(c => ({
          'Contract Number': c.contractNumber,
          'Customer Name': c.customer ? (c.customer as any).name : 'Unknown',
          'Customer Email': c.customer ? (c.customer as any).email : 'N/A',
          'Customer Phone': c.customer ? (c.customer as any).phone : 'N/A',
          'Engine Serial Number': c.engineSerialNumber,
          'Engine Model': c.engineModel,
          'KVA': c.kva,
          'DG Make': c.dgMake,
          'AMC Type': c.amcType,
          'Number of Visits': c.numberOfVisits,
          'Number of Oil Services': c.numberOfOilServices,
          'AMC Start Date': c.amcStartDate,
          'AMC End Date': c.amcEndDate,
          'Contract Value': c.contractValue || 0,
          'Status': c.status,
          'Days Until Expiry': c.daysUntilExpiry,
          'Completion Percentage': c.completionPercentage,
          'Created By': c.createdBy ? (c.createdBy as any).firstName + ' ' + (c.createdBy as any).lastName : 'Unknown',
          'Created At': c.createdAt
        }));
        break;

      case 'revenue_analysis':
        sheetName = 'Revenue Analysis';
        excelData = contractsWithVirtuals.map(c => ({
          'Contract Number': c.contractNumber,
          'Customer Name': c.customer ? (c.customer as any).name : 'Unknown',
          'Contract Value': c.contractValue || 0,
          'AMC Type': c.amcType,
          'Status': c.status,
          'Created Date': c.createdAt,
          'AMC Start Date': c.amcStartDate,
          'AMC End Date': c.amcEndDate
        }));
        break;

      case 'visit_completion':
        sheetName = 'Visit Completion';
        excelData = contractsWithVirtuals.map(c => ({
          'Contract Number': c.contractNumber,
          'Customer Name': c.customer ? (c.customer as any).name : 'Unknown',
          'Engine Serial Number': c.engineSerialNumber,
          'Scheduled Visits': c.numberOfVisits || 0,
          'Completed Visits': c.completedVisits || 0,
          'Completion Rate (%)': (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
          'Next Visit Date': c.nextVisitDate || 'N/A',
          'Status': c.status
        }));
        break;

      case 'expiring_contracts':
        sheetName = 'Expiring Contracts';
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        const expiringContracts = contractsWithVirtuals.filter(c => {
          if (c.status !== AMCStatus.ACTIVE) return false;
          if (!c.amcEndDate) return false;
          const endDate = new Date(c.amcEndDate);
          return endDate <= thirtyDaysFromNow;
        });

        excelData = expiringContracts.map(c => ({
          'Contract Number': c.contractNumber,
          'Customer Name': c.customer ? (c.customer as any).name : 'Unknown',
          'Customer Email': c.customer ? (c.customer as any).email : 'N/A',
          'Customer Phone': c.customer ? (c.customer as any).phone : 'N/A',
          'Engine Serial Number': c.engineSerialNumber,
          'Engine Model': c.engineModel,
          'AMC Type': c.amcType,
          'AMC End Date': c.amcEndDate,
          'Contract Value': c.contractValue || 0,
          'Days Until Expiry': c.daysUntilExpiry,
          'Number of Visits': c.numberOfVisits,
          'Completed Visits': c.completedVisits,
          'Completion Percentage': c.completionPercentage,
          'Contact Person': c.contactPersonName,
          'Contact Number': c.contactNumber
        }));
        break;

      case 'performance_metrics':
        sheetName = 'Performance Metrics';
        excelData = contractsWithVirtuals.map(c => ({
          'Contract Number': c.contractNumber,
          'Customer Name': c.customer ? (c.customer as any).name : 'Unknown',
          'Status': c.status,
          'Completion Rate (%)': (c.numberOfVisits || 0) > 0 ? ((c.completedVisits || 0) / (c.numberOfVisits || 0)) * 100 : 0,
          'Days Until Expiry': c.daysUntilExpiry,
          'Contract Value': c.contractValue || 0,
          'AMC Type': c.amcType,
          'Number of Visits': c.numberOfVisits,
          'Completed Visits': c.completedVisits
        }));
        break;

      default:
        return next(new AppError('Invalid report type', 400));
    }

    // Validate excelData before creating Excel file
    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return next(new AppError('No data available for export', 400));
    }

    // Clean the data to ensure all values are valid
    const cleanedData = excelData.map(row => {
      const cleanedRow: any = {};
      Object.keys(row).forEach(key => {
        const value = (row as any)[key];
        // Convert undefined, null, or invalid values to empty string
        if (value === undefined || value === null || value === 'undefined' || value === 'null') {
          cleanedRow[key] = '';
        } else if (typeof value === 'object' && value !== null) {
          // Convert objects to string representation
          cleanedRow[key] = JSON.stringify(value);
        } else {
          cleanedRow[key] = value;
        }
      });
      return cleanedRow;
    });

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(cleanedData);

    // Set column widths for better formatting
    if (cleanedData.length > 0) {
      const columnWidths = Object.keys(cleanedData[0]).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = columnWidths;
    }

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel buffer with proper options
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    // Set response headers for Excel download
    res.setHeader('Content-Length', excelBuffer.length);

    // Send the Excel file
    res.send(excelBuffer);

  } catch (error) {
    next(error);
  }
}; 