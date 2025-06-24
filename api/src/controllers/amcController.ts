import { Response, NextFunction } from 'express';
import { AMC } from '../models/AMC';
import { AuthenticatedRequest, APIResponse, AMCStatus, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all AMC contracts
// @route   GET /api/v1/amc
// @access  Private
export const getAMCContracts = async (
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
      query.$or = [
        { contractNumber: { $regex: search, $options: 'i' } },
        { terms: { $regex: search, $options: 'i' } }
      ];
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
    const contracts = await AMC.find(query)
      .populate('customer', 'name email phone customerType')
      .populate('products', 'name category brand modelNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('visitSchedule.assignedTo', 'firstName lastName email')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AMC.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

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
      .populate('customer', 'name email phone address customerType')
      .populate('products', 'name category brand modelNumber specifications')
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
    // Generate contract number
    const contractCount = await AMC.countDocuments();
    const contractNumber = `AMC-${new Date().getFullYear()}-${String(contractCount + 1).padStart(4, '0')}`;

    // Calculate next visit date (30 days from start)
    const nextVisitDate = new Date(req.body.startDate);
    nextVisitDate.setDate(nextVisitDate.getDate() + 30);

    const contractData = {
      ...req.body,
      contractNumber,
      nextVisitDate,
      completedVisits: 0,
      createdBy: req.user!.id
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
    const { notes, workCompleted, partsUsed } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    const visit = (contract.visitSchedule as any).id(req.params.visitId);
    if (!visit) {
      return next(new AppError('Visit not found', 404));
    }

    visit.completedDate = new Date();
    visit.status = 'completed';
    visit.notes = notes;

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
// @route   PUT /api/v1/amc/:id/renew
// @access  Private
export const renewAMCContract = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contractValue, scheduledVisits, terms } = req.body;

    const contract = await AMC.findById(req.params.id);
    if (!contract) {
      return next(new AppError('AMC contract not found', 404));
    }

    // Extend contract for another year
    const newEndDate = new Date(contract.endDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);

    // Reset counters and update contract
    contract.endDate = newEndDate;
    contract.contractValue = contractValue || contract.contractValue;
    contract.scheduledVisits = scheduledVisits || contract.scheduledVisits;
    contract.completedVisits = 0;
    contract.status = AMCStatus.ACTIVE;
    contract.terms = terms || contract.terms;
    
    // Calculate next visit date
    const nextVisitDate = new Date();
    nextVisitDate.setDate(nextVisitDate.getDate() + 30);
    contract.nextVisitDate = nextVisitDate;

    await contract.save();

    const response: APIResponse = {
      success: true,
      message: 'AMC contract renewed successfully',
      data: { contract }
    };

    res.status(200).json(response);
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